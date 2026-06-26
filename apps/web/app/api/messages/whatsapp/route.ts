import { createDb, messages } from "@mark-1/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type SendResponse = {
  status: "sent";
  result?: { id?: string | null; to?: string; quoted?: boolean };
};

type WhatsAppSendBody = {
  to: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "document" | "audio";
  caption?: string;
  fileName?: string;
  mimeType?: string;
  quotedMessageId?: string;
  mentionJids?: string[];
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isSendBody(body)) {
    return Response.json({ error: "Expected JSON body with { to, text } or { to, mediaUrl, mediaType }" }, { status: 400 });
  }

  const baseUrl = process.env.WHATSAPP_CONNECTOR_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return Response.json({ error: "WHATSAPP_CONNECTOR_URL is not configured" }, { status: 503 });
  }

  const messageBody = body.mediaUrl ? (body.caption || `[${body.mediaType}] ${body.mediaUrl}`) : (body.text ?? "");
  const dbMessageId = await createPendingMessage(
    body.to,
    messageBody,
    body.mediaUrl
      ? { mediaUrl: body.mediaUrl, mediaType: body.mediaType, fileName: body.fileName, mimeType: body.mimeType, quotedMessageId: body.quotedMessageId, mentionJids: body.mentionJids?.join(",") }
      : { quotedMessageId: body.quotedMessageId, mentionJids: body.mentionJids?.join(",") }
  );

  try {
    const response = await fetch(`${baseUrl}/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.WHATSAPP_CONNECTOR_TOKEN ? { authorization: `Bearer ${process.env.WHATSAPP_CONNECTOR_TOKEN}` } : {})
      },
      body: JSON.stringify(
        body.mediaUrl
          ? { to: body.to, mediaUrl: body.mediaUrl, mediaType: body.mediaType, caption: body.caption, fileName: body.fileName, mimeType: body.mimeType, quotedMessageId: body.quotedMessageId, mentionJids: body.mentionJids }
          : { to: body.to, text: body.text, quotedMessageId: body.quotedMessageId, mentionJids: body.mentionJids }
      )
    });

    const payload = (await response.json().catch(() => ({}))) as Partial<SendResponse> & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? `WhatsApp send failed: ${response.status}`);
    }

    await updateMessageStatus(dbMessageId, "sent", payload.result?.id ?? undefined);
    return Response.json({ status: "sent", messageId: dbMessageId, externalId: payload.result?.id ?? null });
  } catch (error) {
    await updateMessageStatus(dbMessageId, "failed");
    return Response.json({ error: error instanceof Error ? error.message : "send_failed", messageId: dbMessageId }, { status: 502 });
  }
}

async function createPendingMessage(conversationId: string, body: string, sendMetadata?: Record<string, string | undefined>) {
  if (!process.env.DATABASE_URL) return null;

  const db = createDb();
  const [message] = await db
    .insert(messages)
    .values({
      source: "whatsapp",
      conversationId,
      senderName: "Me",
      body,
      status: "pending",
      metadata: { direction: "outgoing", ...sendMetadata }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSendBody(value: unknown): value is WhatsAppSendBody {
  if (!isRecord(value) || typeof value.to !== "string" || !value.to.trim()) return false;

  const hasText = typeof value.text === "string" && value.text.trim().length > 0;
  const hasMedia = typeof value.mediaUrl === "string" && value.mediaUrl.trim().length > 0 && ["image", "video", "document", "audio"].includes(String(value.mediaType));

  return (
    (hasText || hasMedia) &&
    (value.caption === undefined || typeof value.caption === "string") &&
    (value.fileName === undefined || typeof value.fileName === "string") &&
    (value.mimeType === undefined || typeof value.mimeType === "string") &&
    (value.quotedMessageId === undefined || typeof value.quotedMessageId === "string") &&
    (value.mentionJids === undefined || (Array.isArray(value.mentionJids) && value.mentionJids.every((jid) => typeof jid === "string")))
  );
}
