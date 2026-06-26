import makeWASocket, {
  Browsers,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  type WAMessage,
  type WASocket,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
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
  quotedMessageId?: string;
  mentionJids?: string[];
};

type SendMediaInput = {
  to: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "document" | "audio";
  caption?: string;
  fileName?: string;
  mimeType?: string;
  quotedMessageId?: string;
  mentionJids?: string[];
};

type MediaInfo = {
  kind: "image" | "video" | "document" | "audio";
  mimeType?: string;
  fileName?: string;
  caption?: string;
};

const sessionDir = process.env.WHATSAPP_SESSION_DIR ?? ".data/whatsapp-session";
const sessionBackupFile = process.env.WHATSAPP_SESSION_BACKUP_FILE ?? `${sessionDir}.enc`;
const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL ?? "silent" });
const appUrl = process.env.APP_URL;
const connectorToken = process.env.WHATSAPP_CONNECTOR_TOKEN;

let socket: WASocket | undefined;
let status: ConnectionStatus = "idle";
let latestQr: string | null = null;
let lastError: string | null = null;
let lastSessionBackupAt: string | null = null;
let lastSessionBackupError: string | null = null;
const chats = new Map<string, ChatSummary>();
const selectedChatIds = new Set(parseCsv(process.env.WHATSAPP_SELECTED_CHATS));
const recentMessages = new Map<string, WAMessage>();
const maxRecentMessages = 500;

export async function startWhatsApp() {
  if (socket || status === "connecting") return getWhatsAppState();

  status = "connecting";
  lastError = null;

  await restoreSessionBackupIfNeeded();
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  socket = makeWASocket({
    auth: state,
    browser: Browsers.macOS("mark-1"),
    logger,
    printQRInTerminal: false,
    version
  });

  socket.ev.on("creds.update", async () => {
    await saveCreds();
    await backupSession().catch((error: unknown) => {
      lastSessionBackupError = error instanceof Error ? error.message : "session_backup_failed";
    });
  });

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
    sessionBackupConfigured: Boolean(process.env.ENCRYPTION_KEY),
    sessionBackupFile: process.env.ENCRYPTION_KEY ? sessionBackupFile : null,
    lastSessionBackupAt,
    lastSessionBackupError,
    chats: chats.size,
    selectedChats: selectedChatIds.size
  };
}

export function listWhatsAppChats() {
  return [...chats.values()]
    .map((chat) => ({ ...chat, selected: selectedChatIds.has(chat.id) }))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export function listSelectedWhatsAppChats() {
  return [...selectedChatIds];
}

export function setSelectedWhatsAppChats(chatIds: string[]) {
  selectedChatIds.clear();
  for (const chatId of chatIds) {
    if (chatId.trim()) selectedChatIds.add(chatId.trim());
  }
  return listSelectedWhatsAppChats();
}

export async function sendWhatsAppText(input: SendTextInput) {
  const connectedSocket = getConnectedSocket();

  if (!input.to || !input.text) {
    throw new Error("Both 'to' and 'text' are required");
  }

  const quoted = input.quotedMessageId ? recentMessages.get(input.quotedMessageId) : undefined;
  const mentions = cleanMentionJids(input.mentionJids);
  const result = await connectedSocket.sendMessage(input.to, { text: input.text, mentions }, quoted ? { quoted } : undefined);
  return { id: result?.key.id ?? null, to: input.to, quoted: input.quotedMessageId ? Boolean(quoted) : false };
}

export async function sendWhatsAppMedia(input: SendMediaInput) {
  const connectedSocket = getConnectedSocket();

  if (!input.to || !input.mediaUrl || !input.mediaType) {
    throw new Error("'to', 'mediaUrl', and 'mediaType' are required");
  }

  const media = { url: input.mediaUrl };
  const mentions = cleanMentionJids(input.mentionJids);
  const message =
    input.mediaType === "image" ? { image: media, caption: input.caption, mentions } :
    input.mediaType === "video" ? { video: media, caption: input.caption, mentions } :
    input.mediaType === "audio" ? { audio: media, mimetype: input.mimeType } :
    { document: media, fileName: input.fileName ?? "file", mimetype: input.mimeType ?? "application/octet-stream", caption: input.caption, mentions };

  const quoted = input.quotedMessageId ? recentMessages.get(input.quotedMessageId) : undefined;
  const result = await connectedSocket.sendMessage(input.to, message, quoted ? { quoted } : undefined);
  return { id: result?.key.id ?? null, to: input.to, quoted: input.quotedMessageId ? Boolean(quoted) : false };
}

function getConnectedSocket() {
  if (!socket || status !== "connected") {
    throw new Error("WhatsApp is not connected");
  }
  return socket;
}

async function forwardIncomingMessage(message: WAMessage) {
  if (!appUrl || message.key.fromMe) return;

  const remoteJid = message.key.remoteJid;
  const messageId = message.key.id;
  const media = extractMediaInfo(message);
  const text = extractText(message) ?? (media ? `[${media.kind}]` : null);

  if (!remoteJid || !messageId || !text || !selectedChatIds.has(remoteJid)) return;

  rememberRecentMessage(messageId, message);
  const uploadedMedia = media ? await uploadIncomingMedia(message, messageId, media) : null;
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
        receivedAt: message.messageTimestamp ? Number(message.messageTimestamp) : undefined,
        media: uploadedMedia
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to forward WhatsApp message: ${response.status}`);
  }
}

function cleanMentionJids(value: string[] | undefined) {
  return [...new Set((value ?? []).map((jid) => jid.trim()).filter((jid) => jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid")))];
}

function rememberRecentMessage(messageId: string, message: WAMessage) {
  recentMessages.set(messageId, message);
  while (recentMessages.size > maxRecentMessages) {
    const oldestKey = recentMessages.keys().next().value;
    if (!oldestKey) break;
    recentMessages.delete(oldestKey);
  }
}

function parseCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function extractMediaInfo(message: WAMessage): MediaInfo | null {
  const content = message.message;
  if (!content) return null;

  if (content.imageMessage) return { kind: "image", mimeType: content.imageMessage.mimetype ?? undefined, caption: content.imageMessage.caption ?? undefined };
  if (content.videoMessage) return { kind: "video", mimeType: content.videoMessage.mimetype ?? undefined, caption: content.videoMessage.caption ?? undefined };
  if (content.documentMessage) {
    return {
      kind: "document",
      mimeType: content.documentMessage.mimetype ?? undefined,
      fileName: content.documentMessage.fileName ?? undefined,
      caption: content.documentMessage.caption ?? undefined
    };
  }
  if (content.audioMessage) return { kind: "audio", mimeType: content.audioMessage.mimetype ?? undefined };

  return null;
}

async function uploadIncomingMedia(message: WAMessage, messageId: string, media: MediaInfo) {
  if (!hasCloudinaryConfig()) {
    return { kind: media.kind, mimeType: media.mimeType, fileName: media.fileName, uploadStatus: "skipped_missing_cloudinary_config" };
  }

  if (!socket) return { kind: media.kind, mimeType: media.mimeType, fileName: media.fileName, uploadStatus: "skipped_not_connected" };

  const buffer = await downloadMediaMessage(message, "buffer", {}, { logger, reuploadRequest: socket.updateMediaMessage });
  const dataUri = `data:${media.mimeType ?? "application/octet-stream"};base64,${Buffer.from(buffer).toString("base64")}`;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });

  const uploaded = await cloudinary.uploader.upload(dataUri, {
    folder: "mark-1/whatsapp",
    public_id: `wa_${messageId.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
    resource_type: media.kind === "image" ? "image" : media.kind === "video" ? "video" : "raw",
    tags: ["whatsapp", media.kind]
  });

  return {
    kind: media.kind,
    mimeType: media.mimeType,
    fileName: media.fileName,
    uploadStatus: "uploaded",
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    bytes: uploaded.bytes,
    resourceType: uploaded.resource_type
  };
}

type SessionArchive = {
  version: 1;
  files: Array<{ relativePath: string; data: string }>;
};

async function restoreSessionBackupIfNeeded() {
  if (!process.env.ENCRYPTION_KEY || !(await fileExists(sessionBackupFile)) || !(await isDirectoryEmpty(sessionDir))) return;

  const encrypted = await readFile(sessionBackupFile, "utf8");
  const archive = JSON.parse(decryptString(encrypted, process.env.ENCRYPTION_KEY)) as SessionArchive;
  if (archive.version !== 1 || !Array.isArray(archive.files)) throw new Error("Invalid WhatsApp session backup");

  for (const file of archive.files) {
    const targetPath = safeJoin(sessionDir, file.relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, Buffer.from(file.data, "base64"));
  }
}

async function backupSession() {
  if (!process.env.ENCRYPTION_KEY || !(await fileExists(sessionDir))) return;

  const files = await collectSessionFiles(sessionDir);
  if (files.length === 0) return;

  const archive: SessionArchive = { version: 1, files };
  await mkdir(path.dirname(sessionBackupFile), { recursive: true });
  await writeFile(sessionBackupFile, encryptString(JSON.stringify(archive), process.env.ENCRYPTION_KEY), "utf8");
  lastSessionBackupAt = new Date().toISOString();
  lastSessionBackupError = null;
}

async function collectSessionFiles(root: string, current = root): Promise<SessionArchive["files"]> {
  const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
  const files: SessionArchive["files"] = [];
  const backupPath = path.resolve(sessionBackupFile);

  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (path.resolve(fullPath) === backupPath) continue;

    if (entry.isDirectory()) {
      files.push(...(await collectSessionFiles(root, fullPath)));
      continue;
    }

    if (!entry.isFile()) continue;
    files.push({
      relativePath: path.relative(root, fullPath),
      data: (await readFile(fullPath)).toString("base64")
    });
  }

  return files;
}

async function isDirectoryEmpty(directory: string) {
  const entries = await readdir(directory).catch(() => []);
  return entries.length === 0;
}

async function fileExists(filePath: string) {
  return stat(filePath).then(() => true).catch(() => false);
}

function safeJoin(root: string, relativePath: string) {
  const targetPath = path.resolve(root, relativePath);
  const rootPath = path.resolve(root);
  if (!targetPath.startsWith(`${rootPath}${path.sep}`) && targetPath !== rootPath) {
    throw new Error("Invalid session backup path");
  }
  return targetPath;
}

function encryptString(plaintext: string, secret: string) {
  const iv = randomBytes(12);
  const key = createHash("sha256").update(secret).digest();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptString(payload: string, secret: string) {
  const [ivBase64, tagBase64, encryptedBase64] = payload.split(".");
  if (!ivBase64 || !tagBase64 || !encryptedBase64) throw new Error("Invalid encrypted session backup");

  const key = createHash("sha256").update(secret).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedBase64, "base64")), decipher.final()]).toString("utf8");
}

function hasCloudinaryConfig() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}
