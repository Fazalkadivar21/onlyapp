import { createDb, messages } from "@mark-1/db";
import { sendSlackMessage } from "@mark-1/integrations";
import { resolveSlackBotToken } from "@/lib/slack-token";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type SlackSendBody = {
  channelId: string;
  text: string;
  threadTs?: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isSlackSendBody(body)) {
    return Response.json({ error: "Expected JSON body: { channelId: string, text: string, threadTs?: string }" }, { status: 400 });
  }

  const dbMessageId = await createPendingMessage(body);

  try {
    const token = await resolveSlackBotToken();
    if (!token) throw new Error("Slack is not connected. Set SLACK_BOT_TOKEN or connect OAuth.");

    const result = await sendSlackMessage({ ...body, token });
    await updateMessageStatus(dbMessageId, "sent", result.ts);
    return Response.json({ status: "sent", messageId: dbMessageId, externalId: result.ts, result });
  } catch (error) {
    await updateMessageStatus(dbMessageId, "failed");
    return Response.json({ error: error instanceof Error ? error.message : "slack_send_failed", messageId: dbMessageId }, { status: 502 });
  }
}

async function createPendingMessage(input: SlackSendBody) {
  if (!process.env.DATABASE_URL) return null;

  const db = createDb();
  const [message] = await db
    .insert(messages)
    .values({
      source: "slack",
      conversationId: input.channelId,
      senderName: "Me",
      body: input.text,
      status: "pending",
      metadata: { direction: "outgoing", threadTs: input.threadTs }
    })
    .returning({ id: messages.id });

  return message?.id ?? null;
}

async function updateMessageStatus(messageId: string | null, status: "sent" | "failed", externalId?: string) {
  if (!process.env.DATABASE_URL || !messageId) return;

  const db = createDb();
  await db
    .update(messages)
    .set({ status, externalId, updatedAt: new Date() })
    .where(eq(messages.id, messageId));
}

function isSlackSendBody(value: unknown): value is SlackSendBody {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.channelId === "string" &&
    body.channelId.trim().length > 0 &&
    typeof body.text === "string" &&
    body.text.trim().length > 0 &&
    (body.threadTs === undefined || typeof body.threadTs === "string")
  );
}
