import { activityItems, createDb } from "@mark-1/db";
import { fetchJiraActiveSprintIssues, normalizeJiraIssue } from "@mark-1/integrations";
import { and, eq } from "drizzle-orm";
import type { ActivityPriority } from "@mark-1/shared";

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
    let updated = 0;
    let statusChanged = 0;

    for (const item of normalized) {
      const [existing] = await db
        .select()
        .from(activityItems)
        .where(and(eq(activityItems.source, item.source), eq(activityItems.sourceId, item.sourceId)))
        .limit(1);

      if (existing) {
        const previousStatus = jiraStatusFromMetadata(existing.metadata);
        const nextStatus = jiraStatusFromMetadata(item.metadata);

        await db
          .update(activityItems)
          .set({ title: item.title, body: item.body, priority: item.priority, metadata: item.metadata, updatedAt: new Date() })
          .where(eq(activityItems.id, existing.id));
        updated += 1;

        if (previousStatus && nextStatus && previousStatus !== nextStatus) {
          const change = toJiraStatusChangeItem(item, previousStatus, nextStatus);
          const [existingChange] = await db
            .select({ id: activityItems.id })
            .from(activityItems)
            .where(and(eq(activityItems.source, change.source), eq(activityItems.sourceId, change.sourceId)))
            .limit(1);

          if (!existingChange) {
            await db.insert(activityItems).values(change);
            statusChanged += 1;
          }
        }

        deduped += 1;
        continue;
      }

      await db.insert(activityItems).values(item);
      created += 1;
    }

    return Response.json({ created, deduped, updated, statusChanged, total: normalized.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "jira_sync_failed" }, { status: 502 });
  }
}

function toJiraStatusChangeItem(item: ReturnType<typeof normalizeJiraIssue>, previousStatus: string, nextStatus: string) {
  const metadata = isRecord(item.metadata) ? item.metadata : {};
  const issueId = stringValue(metadata.issueId) ?? item.sourceId.replace(/^jira_issue_/, "");
  const key = stringValue(metadata.key) ?? item.title.split(":")[0] ?? "Jira issue";
  const updatedAt = stringValue(metadata.updatedAt) ?? new Date().toISOString();

  return {
    source: "jira" as const,
    sourceId: `jira_issue_status_${issueId}_${slug(nextStatus)}_${Date.parse(updatedAt) || Date.now()}`,
    type: "issue_status_change",
    title: `${key} moved to ${nextStatus}`,
    body: `${key} changed status from ${previousStatus} to ${nextStatus}.`,
    actorName: "Jira",
    url: item.url,
    priority: priorityForStatus(nextStatus),
    status: "unread" as const,
    metadata: { ...metadata, previousStatus, jiraStatus: nextStatus, statusChangedAt: updatedAt }
  };
}

function jiraStatusFromMetadata(metadata: unknown) {
  if (!isRecord(metadata)) return undefined;
  return stringValue(metadata.jiraStatus);
}

function priorityForStatus(status: string): ActivityPriority {
  const normalized = status.toLowerCase();
  if (normalized.includes("block")) return "high";
  if (normalized.includes("done") || normalized.includes("closed") || normalized.includes("resolved")) return "low";
  return "normal";
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function hasJiraConfig() {
  return Boolean(process.env.JIRA_SITE_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN && (process.env.JIRA_BOARD_ID || process.env.JIRA_PROJECT_KEY));
}
