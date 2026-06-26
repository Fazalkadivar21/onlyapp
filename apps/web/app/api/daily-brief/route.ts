import { activityItems, aiSummaries, createDb, syncJobs } from "@mark-1/db";
import { createAiProvider } from "@mark-1/integrations";
import { mockActivityItems, type ActivityItem } from "@mark-1/shared";
import { desc, eq } from "drizzle-orm";
import { createQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

type DbActivityItem = typeof activityItems.$inferSelect;

export async function GET() {
  const items = await loadActivityItems();
  const cached = await loadCachedBrief();

  if (cached) {
    const metadata = isRecord(cached.metadata) ? cached.metadata : {};
    return Response.json({ brief: cached.content, provider: cached.provider, model: typeof metadata.model === "string" ? metadata.model : undefined, cached: true, items: topImportantItems(items) });
  }

  return Response.json({ brief: fallbackBrief(items), provider: "heuristic", cached: false, items: topImportantItems(items) });
}

export async function POST(request: Request) {
  const input = toGenerateBriefInput(await request.json().catch(() => null));

  if (input.async) {
    const queued = await queueDailyBrief(input);
    if (queued) return Response.json(queued, { status: 202 });
  }

  const items = await loadActivityItems();
  const provider = createAiProvider(input.provider, input.model);

  if (!provider) {
    const brief = fallbackBrief(items);
    await saveBrief(brief, "heuristic", { reason: "no_ai_provider" });
    return Response.json({ brief, provider: "heuristic", cached: false });
  }

  try {
    const brief = await provider.summarize(buildDailyBriefPrompt(items));
    await saveBrief(brief, provider.name, { itemCount: items.length, model: input.model });
    return Response.json({ brief, provider: provider.name, model: input.model, cached: false });
  } catch (error) {
    const brief = fallbackBrief(items);
    await saveBrief(brief, "heuristic", { reason: error instanceof Error ? error.message : "ai_failed" });
    return Response.json({ brief, provider: "heuristic", cached: false, error: "ai_failed" }, { status: 200 });
  }
}

async function loadActivityItems(): Promise<ActivityItem[]> {
  if (!process.env.DATABASE_URL) return mockActivityItems;

  try {
    const db = createDb();
    const rows = await db.select().from(activityItems).orderBy(desc(activityItems.createdAt)).limit(50);
    return rows.map(toActivityItem);
  } catch {
    return mockActivityItems;
  }
}

async function loadCachedBrief() {
  if (!process.env.DATABASE_URL) return null;

  try {
    const db = createDb();
    const [summary] = await db.select().from(aiSummaries).where(eq(aiSummaries.type, "daily_brief")).orderBy(desc(aiSummaries.createdAt)).limit(1);
    if (!summary) return null;

    const ageMs = Date.now() - summary.createdAt.getTime();
    return ageMs < 6 * 60 * 60 * 1000 ? summary : null;
  } catch {
    return null;
  }
}

async function saveBrief(content: string, provider: string, metadata: Record<string, unknown>) {
  if (!process.env.DATABASE_URL) return;

  try {
    const db = createDb();
    await db.insert(aiSummaries).values({ type: "daily_brief", provider, content, metadata });
  } catch {
    // Summary generation should not fail the UI just because cache persistence failed.
  }
}

async function queueDailyBrief(input: { provider?: string; model?: string; async?: boolean }) {
  const queue = createQueue("daily-brief");
  if (!queue) return null;

  const syncJobId = await createSyncJob("daily_brief", { provider: input.provider, model: input.model });
  const job = await queue.add("generate", { syncJobId, provider: input.provider, model: input.model }, { attempts: 2, backoff: { type: "exponential", delay: 3000 } });
  await queue.close();
  return { queued: true, jobId: job.id, syncJobId };
}

async function createSyncJob(source: string, metadata: Record<string, unknown>) {
  if (!process.env.DATABASE_URL) return undefined;

  try {
    const db = createDb();
    const [job] = await db.insert(syncJobs).values({ source, status: "queued", metadata }).returning({ id: syncJobs.id });
    return job?.id;
  } catch {
    return undefined;
  }
}

function toGenerateBriefInput(value: unknown) {
  if (!isRecord(value)) return {};

  const provider = typeof value.provider === "string" && ["openai", "anthropic", "ollama"].includes(value.provider) ? value.provider : undefined;
  const model = typeof value.model === "string" && value.model.trim() ? value.model.trim().slice(0, 100) : undefined;
  const async = value.async === true;
  return { provider, model, async };
}

function buildDailyBriefPrompt(items: ActivityItem[]) {
  const lines = topImportantItems(items, 20).map((item) => `- [${item.source}/${item.priority}/${item.status}] ${item.title}: ${item.body} (from ${item.actorName})`);
  return `Create today's daily brief from these normalized activity items.\n\nReturn:\n1. 3-5 bullet summary\n2. Top blockers/risks\n3. Ordered next actions\n\nItems:\n${lines.join("\n")}`;
}

function fallbackBrief(items: ActivityItem[]) {
  const important = topImportantItems(items, 5);
  const urgentCount = items.filter((item) => item.priority === "urgent").length;
  const highCount = items.filter((item) => item.priority === "high").length;
  const unreadCount = items.filter((item) => item.status === "unread").length;

  if (important.length === 0) return "No important activity found yet. Start by syncing Slack, WhatsApp, GitHub, and Jira.";

  return [
    `You have ${unreadCount} unread item(s), ${urgentCount} urgent item(s), and ${highCount} high-priority item(s).`,
    "Top items:",
    ...important.map((item, index) => `${index + 1}. ${item.title} — ${item.body}`),
    "Recommended next step: clear urgent WhatsApp/Slack messages first, then unblock Jira/GitHub work."
  ].join("\n");
}

function topImportantItems(items: ActivityItem[], limit = 8) {
  const score = (item: ActivityItem) => priorityScore(item.priority) + (item.status === "unread" ? 10 : 0);
  return [...items].sort((a, b) => score(b) - score(a) || b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}

function priorityScore(priority: ActivityItem["priority"]) {
  if (priority === "urgent") return 40;
  if (priority === "high") return 30;
  if (priority === "normal") return 20;
  return 10;
}

function toActivityItem(row: DbActivityItem): ActivityItem {
  return {
    ...row,
    actorAvatar: row.actorAvatar ?? undefined,
    url: row.url ?? undefined,
    metadata: isRecord(row.metadata) ? row.metadata : {}
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
