import { Queue, Worker, type ConnectionOptions } from "bullmq";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("REDIS_URL is not set; worker queues are not started.");
} else {
  const connection = redisConnectionFromUrl(redisUrl);

  exportQueue("sync", connection);
  exportQueue("ai-summary", connection);
  exportQueue("daily-brief", connection, processDailyBriefJob);

  console.log("mark-1 worker started");
}

function redisConnectionFromUrl(value: string): ConnectionOptions {
  const url = new URL(value);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null
  };
}

function exportQueue(name: string, connection: ConnectionOptions, processor?: (job: { data: unknown; id?: string }) => Promise<void>) {
  new Queue(name, { connection });
  new Worker(
    name,
    async (job) => {
      console.log(`Processing ${name} job`, { id: job.id, name: job.name });
      if (processor) await processor(job);
    },
    { connection }
  );
}

async function processDailyBriefJob(job: { data: unknown; id?: string }) {
  const data = isRecord(job.data) ? job.data : {};
  const syncJobId = stringValue(data.syncJobId);
  const provider = stringValue(data.provider);
  const model = stringValue(data.model);

  await updateSyncJob(syncJobId, "processing");

  try {
    const appUrl = process.env.APP_URL?.replace(/\/$/, "");
    if (!appUrl) throw new Error("APP_URL is required for daily brief worker jobs");

    const response = await fetch(`${appUrl}/api/daily-brief`, {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify({ provider, model })
    });

    if (!response.ok) throw new Error(`Daily brief generation failed: ${response.status}`);
    await updateSyncJob(syncJobId, "completed");
  } catch (error) {
    await updateSyncJob(syncJobId, "failed", error instanceof Error ? error.message : "daily_brief_failed");
    throw error;
  }
}

async function updateSyncJob(id: string | undefined, status: "processing" | "completed" | "failed", error?: string) {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (!id || !appUrl) return;

  await fetch(`${appUrl}/api/internal/sync-jobs`, {
    method: "PATCH",
    headers: requestHeaders(),
    body: JSON.stringify({ id, status, error })
  }).catch(() => undefined);
}

function requestHeaders() {
  return {
    "content-type": "application/json",
    ...(process.env.WORKER_TOKEN ? { authorization: `Bearer ${process.env.WORKER_TOKEN}` } : {})
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
