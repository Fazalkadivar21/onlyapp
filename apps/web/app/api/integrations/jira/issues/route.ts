import { activityItems, createDb } from "@mark-1/db";
import { fetchJiraActiveSprintIssues, normalizeJiraIssue } from "@mark-1/integrations";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fetchJiraActiveSprintIssues();
    return Response.json({ configured: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "jira_unavailable";
    return Response.json({ configured: hasJiraConfig(), error: message, issues: [] }, { status: hasJiraConfig() ? 502 : 200 });
  }
}

export async function POST() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is required to sync Jira issues" }, { status: 503 });
  }

  try {
    const { issues } = await fetchJiraActiveSprintIssues();
    const normalized = issues.map(normalizeJiraIssue);
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
    return Response.json({ error: error instanceof Error ? error.message : "jira_sync_failed" }, { status: 502 });
  }
}

function hasJiraConfig() {
  return Boolean(process.env.JIRA_SITE_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN && (process.env.JIRA_BOARD_ID || process.env.JIRA_PROJECT_KEY));
}
