import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WAMessage,
  type WASocket,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";

type DisconnectError = Error & { output?: { statusCode?: number } };

type ConnectionStatus = "idle" | "connecting" | "qr" | "connected" | "disconnected";

type ChatSummary = {
  id: string;
  name?: string;
  unreadCount?: number;
  updatedAt?: number;
};

type SendTextInput = {
  to: string;
  text: string;
};

const sessionDir = process.env.WHATSAPP_SESSION_DIR ?? ".data/whatsapp-session";
const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL ?? "silent" });
const appUrl = process.env.APP_URL;
const connectorToken = process.env.WHATSAPP_CONNECTOR_TOKEN;

let socket: WASocket | undefined;
let status: ConnectionStatus = "idle";
let latestQr: string | null = null;
let lastError: string | null = null;
const chats = new Map<string, ChatSummary>();

export async function startWhatsApp() {
  if (socket || status === "connecting") return getWhatsAppState();

  status = "connecting";
  lastError = null;

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  socket = makeWASocket({
    auth: state,
    browser: Browsers.macOS("mark-1"),
    logger,
    printQRInTerminal: false,
    version
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", (update) => {
    if (update.qr) {
      latestQr = update.qr;
      status = "qr";
      qrcode.generate(update.qr, { small: true });
    }

    if (update.connection === "open") {
      status = "connected";
      latestQr = null;
      lastError = null;
    }

    if (update.connection === "close") {
      const disconnectError = update.lastDisconnect?.error as DisconnectError | undefined;
      const statusCode = Number(disconnectError?.output?.statusCode);
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      status = "disconnected";
      socket = undefined;
      lastError = disconnectError?.message ?? null;

      if (shouldReconnect) {
        void startWhatsApp().catch((error) => {
          lastError = error instanceof Error ? error.message : "reconnect_failed";
        });
      }
    }
  });

  socket.ev.on("chats.upsert", (updates) => {
    for (const chat of updates) {
      if (!chat.id) continue;
      chats.set(chat.id, {
        id: chat.id,
        name: chat.name ?? undefined,
        unreadCount: chat.unreadCount ?? undefined,
        updatedAt: Number(chat.conversationTimestamp ?? 0) || undefined
      });
    }
  });

  socket.ev.on("chats.update", (updates) => {
    for (const chat of updates) {
      if (!chat.id) continue;
      const existing: ChatSummary = chats.get(chat.id) ?? { id: chat.id };
      chats.set(chat.id, {
        ...existing,
        name: chat.name ?? existing.name,
        unreadCount: chat.unreadCount ?? existing.unreadCount,
        updatedAt: Number(chat.conversationTimestamp ?? existing.updatedAt ?? 0) || undefined
      });
    }
  });

  socket.ev.on("messages.upsert", (update) => {
    for (const message of update.messages) {
      void forwardIncomingMessage(message).catch((error: unknown) => {
        lastError = error instanceof Error ? error.message : "message_forward_failed";
      });
    }
  });

  return getWhatsAppState();
}

export function getWhatsAppState() {
  return {
    status,
    qr: latestQr,
    lastError,
    sessionDir,
    chats: chats.size
  };
}

export function listWhatsAppChats() {
  return [...chats.values()].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export async function sendWhatsAppText(input: SendTextInput) {
  if (!socket || status !== "connected") {
    throw new Error("WhatsApp is not connected");
  }

  if (!input.to || !input.text) {
    throw new Error("Both 'to' and 'text' are required");
  }

  const result = await socket.sendMessage(input.to, { text: input.text });
  return { id: result?.key.id ?? null, to: input.to };
}

async function forwardIncomingMessage(message: WAMessage) {
  if (!appUrl || message.key.fromMe) return;

  const remoteJid = message.key.remoteJid;
  const messageId = message.key.id;
  const text = extractText(message);

  if (!remoteJid || !messageId || !text) return;

  const chat = chats.get(remoteJid);
  const actorName = message.pushName ?? chat?.name ?? remoteJid;
  const response = await fetch(new URL("/api/activity-items", appUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(connectorToken ? { authorization: `Bearer ${connectorToken}` } : {})
    },
    body: JSON.stringify({
      source: "whatsapp",
      sourceId: messageId,
      type: "message",
      title: `WhatsApp message${chat?.name ? ` in ${chat.name}` : ""}`,
      body: text,
      actorName,
      priority: "normal",
      status: "unread",
      metadata: {
        chatId: remoteJid,
        messageId,
        fromMe: false,
        receivedAt: message.messageTimestamp ? Number(message.messageTimestamp) : undefined
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to forward WhatsApp message: ${response.status}`);
  }
}

function extractText(message: WAMessage) {
  const content = message.message;
  if (!content) return null;

  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    content.documentMessage?.caption ??
    null
  );
}
