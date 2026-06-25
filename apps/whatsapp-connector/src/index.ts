import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { getWhatsAppState, listSelectedWhatsAppChats, listWhatsAppChats, sendWhatsAppText, setSelectedWhatsAppChats, startWhatsApp } from "./whatsapp.js";

const app = new Hono();

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

  if (!isSendTextBody(body)) {
    return c.json({ error: "Expected JSON body: { to: string, text: string }" }, 400);
  }

  try {
    const result = await sendWhatsAppText(body);
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

function isSendTextBody(value: unknown): value is { to: string; text: string } {
  return typeof value === "object" && value !== null && "to" in value && "text" in value && typeof value.to === "string" && typeof value.text === "string";
}

function isSelectedChatsBody(value: unknown): value is { chatIds: string[] } {
  return typeof value === "object" && value !== null && "chatIds" in value && Array.isArray(value.chatIds) && value.chatIds.every((chatId) => typeof chatId === "string");
}
