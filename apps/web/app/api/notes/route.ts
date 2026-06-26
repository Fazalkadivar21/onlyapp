import { activityItems, createDb, noteLinks, notes } from "@mark-1/db";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const mockNotes = [
  {
    id: "mock_note_1",
    title: "Daily scratchpad",
    content: "Use this space to capture thoughts, follow-ups, and decisions.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ notes: mockNotes, source: "mock" });
  }

  try {
    const db = createDb();
    const rows = await db.select().from(notes).orderBy(desc(notes.updatedAt)).limit(100);
    return Response.json({ notes: rows, source: "database" });
  } catch (error) {
    console.error("Failed to list notes", error instanceof Error ? error.message : "unknown error");
    return Response.json({ notes: mockNotes, source: "mock", error: "database_unavailable" });
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is required to create notes" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const db = createDb();
  const activityItemId = isRecord(body) && typeof body.activityItemId === "string" ? body.activityItemId : undefined;
  const activityItem = activityItemId
    ? (await db.select().from(activityItems).where(eq(activityItems.id, activityItemId)).limit(1))[0]
    : undefined;

  if (activityItemId && !activityItem) return Response.json({ error: "Activity item not found" }, { status: 404 });

  const title = isRecord(body) && typeof body.title === "string" && body.title.trim()
    ? body.title.trim()
    : activityItem
      ? `Note: ${activityItem.title}`
      : "Untitled";
  const content = isRecord(body) && typeof body.content === "string"
    ? body.content
    : activityItem
      ? formatActivityItemNote(activityItem)
      : "";

  const [note] = await db.insert(notes).values({ title, content }).returning();
  if (note && activityItem) {
    await db.insert(noteLinks).values({ noteId: note.id, activityItemId: activityItem.id }).onConflictDoNothing();
  }
  return Response.json({ note }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is required to update notes" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.id !== "string") {
    return Response.json({ error: "Expected JSON body with note id" }, { status: 400 });
  }

  const values: { title?: string; content?: string; updatedAt: Date } = { updatedAt: new Date() };
  if (typeof body.title === "string") values.title = body.title.trim() || "Untitled";
  if (typeof body.content === "string") values.content = body.content;

  const db = createDb();
  const [note] = await db.update(notes).set(values).where(eq(notes.id, body.id)).returning();
  if (!note) return Response.json({ error: "Note not found" }, { status: 404 });

  return Response.json({ note });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatActivityItemNote(item: typeof activityItems.$inferSelect) {
  const lines = [
    `# ${item.title}`,
    "",
    `Source: ${item.source}`,
    `Actor: ${item.actorName}`,
    `Status: ${item.status}`,
    `Priority: ${item.priority}`,
    item.url ? `URL: ${item.url}` : undefined,
    "",
    item.body,
    "",
    "## Follow-ups",
    "- "
  ];

  return lines.filter((line): line is string => line !== undefined).join("\n");
}
