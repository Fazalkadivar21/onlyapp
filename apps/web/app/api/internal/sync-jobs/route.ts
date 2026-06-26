import { createDb, syncJobs } from "@mark-1/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL) return Response.json({ error: "DATABASE_URL is required" }, { status: 503 });

  const input = toSyncJobUpdate(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "Invalid sync job update payload" }, { status: 400 });

  const db = createDb();
  const [job] = await db
    .update(syncJobs)
    .set({ status: input.status, error: input.error, updatedAt: new Date() })
    .where(eq(syncJobs.id, input.id))
    .returning({ id: syncJobs.id, status: syncJobs.status, error: syncJobs.error, updatedAt: syncJobs.updatedAt });

  if (!job) return Response.json({ error: "Sync job not found" }, { status: 404 });
  return Response.json({ job });
}

function isAuthorized(request: Request) {
  const token = process.env.WORKER_TOKEN;
  if (!token) return true;
  return request.headers.get("authorization") === `Bearer ${token}`;
}

function toSyncJobUpdate(value: unknown) {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id);
  const status = stringValue(value.status);
  const error = stringValue(value.error);
  if (!id || !status || !["queued", "processing", "completed", "failed"].includes(status)) return null;
  return { id, status, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
