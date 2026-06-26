import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { getWhatsAppState, listSelectedWhatsAppChats, listWhatsAppChats, sendWhatsAppMedia, sendWhatsAppText, setSelectedWhatsAppChats, startWhatsApp } from "./whatsapp.js";

const app = new Hono();

app.use("*", async (c, next) => {
  const token = process.env.WHATSAPP_CONNECTOR_TOKEN;
  if (!token || c.req.path === "/health") return next();

  if (c.req.header("authorization") !== `Bearer ${token}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return next();
});

app.get("/health", (c) => c.json({ ok: true, service: "whatsapp-connector", whatsapp: getWhatsAppState() }));

app.post("/connect", async (c) => {
  const state = await startWhatsApp();
  return c.json(state);
});

app.get("/qr", async (c) => {
  const state = await startWhatsApp();
  return c.json(state);
});

app.get("/chats", (c) => c.json({ chats: listWhatsAppChats() }));

app.get("/selected-chats", (c) => c.json({ chatIds: listSelectedWhatsAppChats() }));

app.post("/selected-chats", async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!isSelectedChatsBody(body)) {
    return c.json({ error: "Expected JSON body: { chatIds: string[] }" }, 400);
  }

  return c.json({ chatIds: setSelectedWhatsAppChats(body.chatIds) });
});

app.post("/send", async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!isSendTextBody(body) && !isSendMediaBody(body)) {
    return c.json({ error: "Expected JSON body: { to: string, text: string } or { to: string, mediaUrl: string, mediaType: image|video|document|audio }. Optional quotedMessageId quotes a recent incoming message; optional mentionJids tags group members." }, 400);
  }

  try {
    const result = isSendMediaBody(body) ? await sendWhatsAppMedia(body) : await sendWhatsAppText(body);
    return c.json({ status: "sent", result });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "send_failed" }, 400);
  }
});

const port = Number(process.env.PORT ?? 3002);
serve({ fetch: app.fetch, port });
console.log(`WhatsApp connector listening on ${port}`);

if (process.env.WHATSAPP_AUTO_CONNECT === "true") {
  void startWhatsApp().catch((error: unknown) => {
    console.error("Failed to auto-start WhatsApp", error instanceof Error ? error.message : "unknown error");
  });
}

function isSendTextBody(value: unknown): value is { to: string; text: string; quotedMessageId?: string; mentionJids?: string[] } {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.to === "string" &&
    typeof body.text === "string" &&
    (body.quotedMessageId === undefined || typeof body.quotedMessageId === "string") &&
    isOptionalStringArray(body.mentionJids)
  );
}

function isSelectedChatsBody(value: unknown): value is { chatIds: string[] } {
  return typeof value === "object" && value !== null && "chatIds" in value && Array.isArray(value.chatIds) && value.chatIds.every((chatId) => typeof chatId === "string");
}

function isSendMediaBody(value: unknown): value is { to: string; mediaUrl: string; mediaType: "image" | "video" | "document" | "audio"; caption?: string; fileName?: string; mimeType?: string; quotedMessageId?: string; mentionJids?: string[] } {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.to === "string" &&
    typeof body.mediaUrl === "string" &&
    ["image", "video", "document", "audio"].includes(String(body.mediaType)) &&
    (body.caption === undefined || typeof body.caption === "string") &&
    (body.fileName === undefined || typeof body.fileName === "string") &&
    (body.mimeType === undefined || typeof body.mimeType === "string") &&
    (body.quotedMessageId === undefined || typeof body.quotedMessageId === "string") &&
    isOptionalStringArray(body.mentionJids)
  );
}

function isOptionalStringArray(value: unknown) {
  return value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string"));
}
