import { activityItems, createDb } from "@mark-1/db";
import { fetchSlackChannels, fetchSlackDms, fetchSlackSelectedChannelMessages, normalizeSlackMessage, parseSlackSelectedChannels, parseSlackSelectedDms } from "@mark-1/integrations";
import { resolveSlackBotToken } from "@/lib/slack-token";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const token = await resolveSlackBotToken();
    if (!token) throw new Error("Slack is not connected. Set SLACK_BOT_TOKEN or connect OAuth.");

    const channels = await fetchSlackChannels({ token });
    const dmsResult: { dms: Awaited<ReturnType<typeof fetchSlackDms>>; dmError?: string } = await fetchSlackDms({ token })
      .then((dms) => ({ dms }))
      .catch((error: unknown) => ({ dms: [], dmError: error instanceof Error ? error.message : "slack_dm_unavailable" }));
    const selectedChannels = parseSlackSelectedChannels();
    const selectedDms = parseSlackSelectedDms();
    return Response.json({ configured: true, oauthConfigured: Boolean(process.env.SLACK_CLIENT_ID), selectedChannels, selectedDms, channels, dms: dmsResult.dms, dmError: dmsResult.dmError });
  } catch (error) {
    const message = error instanceof Error ? error.message : "slack_unavailable";
    const configured = Boolean(process.env.SLACK_BOT_TOKEN || (process.env.DATABASE_URL && process.env.ENCRYPTION_KEY));
    return Response.json({ configured, oauthConfigured: Boolean(process.env.SLACK_CLIENT_ID), selectedChannels: parseSlackSelectedChannels(), selectedDms: parseSlackSelectedDms(), error: message, channels: [], dms: [] }, { status: configured ? 502 : 200 });
  }
}

export async function POST() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is required to sync Slack messages" }, { status: 503 });
  }

  try {
    const token = await resolveSlackBotToken();
    if (!token) return Response.json({ error: "Slack is not connected. Set SLACK_BOT_TOKEN or connect OAuth." }, { status: 503 });

    const messages = await fetchSlackSelectedChannelMessages({ token });
    const normalized = messages.map(normalizeSlackMessage);
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
    return Response.json({ error: error instanceof Error ? error.message : "slack_sync_failed" }, { status: 502 });
  }
}
