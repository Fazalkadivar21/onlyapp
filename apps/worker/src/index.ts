import { Queue, Worker, type ConnectionOptions } from "bullmq";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("REDIS_URL is not set; worker queues are not started.");
} else {
  const connection = redisConnectionFromUrl(redisUrl);

  exportQueue("sync", connection);
  exportQueue("ai-summary", connection);
  exportQueue("daily-brief", connection);

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

function exportQueue(name: string, connection: ConnectionOptions) {
  new Queue(name, { connection });
  new Worker(
    name,
    async (job) => {
      console.log(`Processing ${name} job`, { id: job.id, name: job.name });
    },
    { connection }
  );
}
