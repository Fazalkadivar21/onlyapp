import { activityItems, createDb } from "@mark-1/db";
import { mockActivityItems, type ActivityPriority, type ActivitySource, type ActivityStatus } from "@mark-1/shared";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const sources: ActivitySource[] = ["slack", "whatsapp", "github", "jira"];
const priorities: ActivityPriority[] = ["low", "normal", "high", "urgent"];
const statuses: ActivityStatus[] = ["unread", "seen", "done", "snoozed"];

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ items: mockActivityItems, source: "mock" });
  }

  try {
    const db = createDb();
    const items = await db.select().from(activityItems).orderBy(desc(activityItems.createdAt)).limit(100);
    return Response.json({ items, source: "database" });
  } catch (error) {
    console.error("Failed to list activity items", error instanceof Error ? error.message : "unknown error");
    return Response.json({ items: mockActivityItems, source: "mock", error: "database_unavailable" });
  }
}

export async function POST(request: Request) {
  if (!isAuthorizedInternalWrite(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is required to create activity items" }, { status: 503 });
  }

  const input = toCreateActivityInput(await request.json().catch(() => null));
  if (!input) {
    return Response.json({ error: "Invalid activity item payload" }, { status: 400 });
  }

  const db = createDb();
  const [existing] = await db
    .select()
    .from(activityItems)
    .where(and(eq(activityItems.source, input.source), eq(activityItems.sourceId, input.sourceId)))
    .limit(1);

  if (existing) {
    return Response.json({ item: existing, deduped: true });
  }

  const [item] = await db.insert(activityItems).values(input).returning();
  return Response.json({ item }, { status: 201 });
}

function isAuthorizedInternalWrite(request: Request) {
  const token = process.env.WHATSAPP_CONNECTOR_TOKEN;
  if (!token) return true;
  return request.headers.get("authorization") === `Bearer ${token}`;
}

function toCreateActivityInput(value: unknown) {
  if (!isRecord(value)) return null;

  const source = stringValue(value.source);
  const priority = stringValue(value.priority) ?? "normal";
  const status = stringValue(value.status) ?? "unread";

  if (!source || !isOneOf(source, sources) || !isOneOf(priority, priorities) || !isOneOf(status, statuses)) {
    return null;
  }

  const sourceId = stringValue(value.sourceId);
  const type = stringValue(value.type);
  const title = stringValue(value.title);
  const body = stringValue(value.body);
  const actorName = stringValue(value.actorName);

  if (!sourceId || !type || !title || !body || !actorName) return null;

  return {
    source,
    sourceId,
    type,
    title,
    body,
    actorName,
    actorAvatar: stringValue(value.actorAvatar),
    url: stringValue(value.url),
    priority,
    status,
    metadata: isRecord(value.metadata) ? value.metadata : {}
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isOneOf<T extends string>(value: string, allowed: T[]): value is T {
  return allowed.includes(value as T);
}
