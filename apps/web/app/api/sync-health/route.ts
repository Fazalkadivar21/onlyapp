import { createDb, messages, syncJobs } from "@mark-1/db";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type HealthStatus = "ok" | "warning" | "error" | "unknown";

type HealthCheck = {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
  updatedAt?: string;
};

export async function GET() {
  const checks: HealthCheck[] = [
    envCheck("database", "Database", Boolean(process.env.DATABASE_URL), "DATABASE_URL configured", "Using mock/no-DB fallback"),
    envCheck("redis", "Redis / queues", Boolean(process.env.REDIS_URL), "REDIS_URL configured", "Queues not configured yet"),
    envCheck("slack", "Slack", Boolean(process.env.SLACK_BOT_TOKEN), "SLACK_BOT_TOKEN configured", "Slack token missing"),
    envCheck("github", "GitHub", Boolean(process.env.GITHUB_TOKEN), "GITHUB_TOKEN configured", "GitHub token missing"),
    envCheck("jira", "Jira", Boolean(process.env.JIRA_SITE_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN), "Jira env configured", "Jira env missing"),
    envCheck("cloudinary", "Cloudinary", Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET), "Cloudinary env configured", "Media upload env missing"),
    envCheck("ai", "AI provider", Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OLLAMA_BASE_URL), "At least one AI provider configured", "No AI provider configured")
  ];

  checks.push(await whatsappCheck());

  const recent = process.env.DATABASE_URL ? await dbHealth() : { failedMessages: [], syncJobs: [] };
  const summary = summarize(checks, recent.failedMessages.length);

  return Response.json({ summary, checks, recent, generatedAt: new Date().toISOString() });
}

function envCheck(id: string, label: string, configured: boolean, okDetail: string, missingDetail: string): HealthCheck {
  return { id, label, status: configured ? "ok" : "warning", detail: configured ? okDetail : missingDetail };
}

async function whatsappCheck(): Promise<HealthCheck> {
  const baseUrl = process.env.WHATSAPP_CONNECTOR_URL?.replace(/\/$/, "");
  if (!baseUrl) return { id: "whatsapp", label: "WhatsApp connector", status: "warning", detail: "WHATSAPP_CONNECTOR_URL missing" };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${baseUrl}/health`, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);
    const payload = (await response.json().catch(() => ({}))) as { status?: string; chats?: number; selectedChats?: number; lastSessionBackupError?: string | null; lastSessionBackupAt?: string | null };
    const connected = response.ok && payload.status === "connected";
    const backupError = payload.lastSessionBackupError ? ` Backup error: ${payload.lastSessionBackupError}` : "";
    return {
      id: "whatsapp",
      label: "WhatsApp connector",
      status: connected ? "ok" : response.ok ? "warning" : "error",
      detail: `${payload.status ?? response.statusText}; chats ${payload.chats ?? 0}, selected ${payload.selectedChats ?? 0}.${backupError}`,
      updatedAt: payload.lastSessionBackupAt ?? undefined
    };
  } catch (error) {
    return { id: "whatsapp", label: "WhatsApp connector", status: "error", detail: error instanceof Error ? error.message : "health_check_failed" };
  }
}

async function dbHealth() {
  try {
    const db = createDb();
    const [failedMessages, jobs] = await Promise.all([
      db
        .select({ id: messages.id, source: messages.source, conversationId: messages.conversationId, status: messages.status, updatedAt: messages.updatedAt })
        .from(messages)
        .where(eq(messages.status, "failed"))
        .orderBy(desc(messages.updatedAt))
        .limit(5),
      db
        .select({ id: syncJobs.id, source: syncJobs.source, status: syncJobs.status, error: syncJobs.error, updatedAt: syncJobs.updatedAt })
        .from(syncJobs)
        .orderBy(desc(syncJobs.updatedAt))
        .limit(5)
    ]);

    return { failedMessages, syncJobs: jobs };
  } catch (error) {
    return {
      failedMessages: [],
      syncJobs: [{ id: "db-error", source: "database", status: "error", error: error instanceof Error ? error.message : "database_error", updatedAt: new Date() }]
    };
  }
}

function summarize(checks: HealthCheck[], failedMessageCount: number) {
  const errors = checks.filter((check) => check.status === "error").length + failedMessageCount;
  const warnings = checks.filter((check) => check.status === "warning").length;
  return {
    status: errors > 0 ? "error" : warnings > 0 ? "warning" : "ok",
    errors,
    warnings,
    ok: checks.filter((check) => check.status === "ok").length
  };
}
