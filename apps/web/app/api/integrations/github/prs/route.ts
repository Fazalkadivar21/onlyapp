import { activityItems, createDb } from "@mark-1/db";
import { fetchGitHubPullRequestActivity, normalizeGitHubPullRequest } from "@mark-1/integrations";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pullRequests = await fetchGitHubPullRequestActivity();
    return Response.json({ configured: true, pullRequests });
  } catch (error) {
    const message = error instanceof Error ? error.message : "github_unavailable";
    return Response.json({ configured: Boolean(process.env.GITHUB_TOKEN), error: message, pullRequests: [] }, { status: process.env.GITHUB_TOKEN ? 502 : 200 });
  }
}

export async function POST() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is required to sync GitHub PRs" }, { status: 503 });
  }

  try {
    const pullRequests = await fetchGitHubPullRequestActivity();
    const normalized = pullRequests.map(normalizeGitHubPullRequest);
    const db = createDb();
    let created = 0;
    let deduped = 0;

    for (const item of normalized) {
      const [existing] = await db
        .select({ id: activityItems.id })
        .from(activityItems)
        .where(and(eq(activityItems.source, item.source), eq(activityItems.sourceId, item.sourceId)))
        .limit(1);

      if (existing) {
        deduped += 1;
        continue;
      }

      await db.insert(activityItems).values(item);
      created += 1;
    }

    return Response.json({ created, deduped, total: normalized.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "github_sync_failed" }, { status: 502 });
  }
}
