import { activityItems, createDb } from "@mark-1/db";
import { mockActivityItems, type ActivityItem, type ActivityPriority, type ActivitySource, type ActivityStatus } from "@mark-1/shared";
import { and, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";

export const dynamic = "force-dynamic";

const sources: ActivitySource[] = ["slack", "whatsapp", "github", "jira"];
const priorities: ActivityPriority[] = ["low", "normal", "high", "urgent"];
const statuses: ActivityStatus[] = ["unread", "seen", "done", "snoozed"];

export async function GET(request: Request) {
  const query = parseActivityQuery(new URL(request.url).searchParams);

  if (!process.env.DATABASE_URL) {
    return Response.json({ items: filterMockItems(mockActivityItems, query), source: "mock" });
  }

  try {
    const db = createDb();
    const conditions = buildActivityConditions(query);
    const items = await db
      .select()
      .from(activityItems)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(activityItems.createdAt))
      .limit(query.limit)
      .offset(query.offset);
    return Response.json({ items, source: "database" });
  } catch (error) {
    console.error("Failed to list activity items", error instanceof Error ? error.message : "unknown error");
    return Response.json({ items: filterMockItems(mockActivityItems, query), source: "mock", error: "database_unavailable" });
  }
}

export async function PATCH(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is required to update activity items" }, { status: 503 });
  }

  const input = toUpdateActivityInput(await request.json().catch(() => null));
  if (!input) {
    return Response.json({ error: "Invalid activity item update payload" }, { status: 400 });
  }

  const db = createDb();
  const [item] = await db
    .update(activityItems)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(activityItems.id, input.id))
    .returning();

  if (!item) {
    return Response.json({ error: "Activity item not found" }, { status: 404 });
  }

  return Response.json({ item });
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

type ActivityQuery = {
  sources: ActivitySource[];
  priorities: ActivityPriority[];
  statuses: ActivityStatus[];
  q?: string;
  limit: number;
  offset: number;
};

function parseActivityQuery(searchParams: URLSearchParams): ActivityQuery {
  return {
    sources: parseEnumList(searchParams.get("sources"), sources),
    priorities: parseEnumList(searchParams.get("priorities"), priorities),
    statuses: parseEnumList(searchParams.get("statuses"), statuses),
    q: cleanSearch(searchParams.get("q")),
    limit: clampNumber(searchParams.get("limit"), 1, 100, 100),
    offset: clampNumber(searchParams.get("offset"), 0, 10_000, 0)
  };
}

function buildActivityConditions(query: ActivityQuery) {
  const conditions: SQL[] = [];

  if (query.sources.length > 0) conditions.push(inArray(activityItems.source, query.sources));
  if (query.priorities.length > 0) conditions.push(inArray(activityItems.priority, query.priorities));
  if (query.statuses.length > 0) conditions.push(inArray(activityItems.status, query.statuses));
  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    const textMatch = or(
      ilike(activityItems.title, pattern),
      ilike(activityItems.body, pattern),
      ilike(activityItems.actorName, pattern),
      ilike(activityItems.type, pattern)
    );
    if (textMatch) conditions.push(textMatch);
  }

  return conditions;
}

function filterMockItems(items: ActivityItem[], query: ActivityQuery) {
  return items
    .filter((item) => {
      if (query.sources.length > 0 && !query.sources.includes(item.source)) return false;
      if (query.priorities.length > 0 && !query.priorities.includes(item.priority)) return false;
      if (query.statuses.length > 0 && !query.statuses.includes(item.status)) return false;
      if (query.q) {
        const haystack = `${item.title} ${item.body} ${item.actorName} ${item.type}`.toLowerCase();
        if (!haystack.includes(query.q.toLowerCase())) return false;
      }
      return true;
    })
    .slice(query.offset, query.offset + query.limit);
}

function parseEnumList<T extends string>(value: string | null, allowed: T[]) {
  if (!value) return [];
  const selected = value.split(",").filter((item): item is T => isOneOf(item, allowed));
  return [...new Set(selected)];
}

function cleanSearch(value: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned.slice(0, 120) : undefined;
}

function clampNumber(value: string | null, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function toUpdateActivityInput(value: unknown) {
  if (!isRecord(value)) return null;

  const id = stringValue(value.id);
  const status = stringValue(value.status);
  if (!id || !status || !isOneOf(status, statuses)) return null;

  return { id, status };
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
