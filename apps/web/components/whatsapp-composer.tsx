"use client";

import { useEffect, useState } from "react";

type ChatSummary = {
  id: string;
  name?: string;
  selected?: boolean;
};

type IntegrationResponse = {
  configured?: boolean;
  chats?: ChatSummary[];
  error?: string;
};

type MediaType = "image" | "video" | "document" | "audio";

type LocalSend = {
  id: string;
  to: string;
  text: string;
  status: "pending" | "sent" | "failed";
  error?: string;
};

export function WhatsAppComposer({ replyTarget }: { replyTarget?: { chatId: string; draft?: string; quotedMessageId?: string; nonce: number } }) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [quotedMessageId, setQuotedMessageId] = useState<string>();
  const [loadingChats, setLoadingChats] = useState(true);
  const [sends, setSends] = useState<LocalSend[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/integrations/whatsapp", { cache: "no-store" })
      .then((response) => response.json() as Promise<IntegrationResponse>)
      .then((payload) => {
        if (cancelled) return;
        const selectedChats = (payload.chats ?? []).filter((chat) => chat.selected);
        setChats(selectedChats);
        setTo(selectedChats[0]?.id ?? "");
      })
      .finally(() => {
        if (!cancelled) setLoadingChats(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!replyTarget) return;
    setTo(replyTarget.chatId);
    setText(replyTarget.draft ?? "");
    setQuotedMessageId(replyTarget.quotedMessageId);
  }, [replyTarget]);

  async function uploadFile(file: File | undefined) {
    if (!file) return;

    setUploading(true);
    setUploadError(undefined);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/media/upload", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; mediaType?: MediaType; fileName?: string; mimeType?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "upload_failed");

      setMediaUrl(payload.url);
      if (payload.mediaType) setMediaType(payload.mediaType);
      setFileName(payload.fileName ?? file.name);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "upload_failed");
    } finally {
      setUploading(false);
    }
  }

  async function sendMessage() {
    const trimmed = text.trim();
    const trimmedMediaUrl = mediaUrl.trim();
    if (!to || (!trimmed && !trimmedMediaUrl)) return;

    const localId = crypto.randomUUID();
    const label = trimmedMediaUrl ? `${trimmed || `[${mediaType}]`} · ${trimmedMediaUrl}` : trimmed;
    setSends((current) => [{ id: localId, to, text: label, status: "pending" }, ...current]);
    const quoteId = quotedMessageId;
    setText("");
    setMediaUrl("");
    setQuotedMessageId(undefined);

    try {
      const response = await fetch("/api/messages/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          trimmedMediaUrl
            ? { to, mediaUrl: trimmedMediaUrl, mediaType, caption: trimmed || undefined, fileName: fileName.trim() || undefined, quotedMessageId: quoteId }
            : { to, text: trimmed, quotedMessageId: quoteId }
        )
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) throw new Error(payload.error ?? "send_failed");
      setSends((current) => current.map((send) => (send.id === localId ? { ...send, status: "sent" } : send)));
    } catch (error) {
      setSends((current) => current.map((send) => (send.id === localId ? { ...send, status: "failed", error: error instanceof Error ? error.message : "send_failed" } : send)));
    }
  }

  return (
    <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">WhatsApp composer</h2>
          <p className="mt-1 text-sm text-zinc-500">Optimistic text/media send to selected WhatsApp chats/groups.</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{loadingChats ? "loading" : `${chats.length} selected`}</span>
      </div>

      {quotedMessageId ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="truncate">Reply will quote WhatsApp message {quotedMessageId}</span>
          <button type="button" onClick={() => setQuotedMessageId(undefined)} className="shrink-0 font-medium">Clear quote</button>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-[260px_1fr_auto]">
        <select value={to} onChange={(event) => setTo(event.target.value)} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm" disabled={!to && chats.length === 0}>
          {chats.length === 0 ? <option>No selected chats</option> : null}
          {to && !chats.some((chat) => chat.id === to) ? <option value={to}>{to}</option> : null}
          {chats.map((chat) => <option key={chat.id} value={chat.id}>{chat.name ?? chat.id}</option>)}
        </select>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) void sendMessage();
          }}
          placeholder="Type a WhatsApp message…"
          className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-400"
          disabled={!to && chats.length === 0}
        />
        <button onClick={sendMessage} disabled={!to || (!text.trim() && !mediaUrl.trim())} className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-40">Send</button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr_180px]">
        <select value={mediaType} onChange={(event) => setMediaType(event.target.value as MediaType)} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="document">File</option>
          <option value="audio">Audio</option>
        </select>
        <input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="Optional media URL, or upload a file below…" className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-400" />
        <input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="File name" className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-400" disabled={mediaType !== "document"} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
        <input
          type="file"
          onChange={(event) => void uploadFile(event.target.files?.[0])}
          disabled={uploading}
          className="text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium disabled:opacity-50"
        />
        <span className="text-xs text-zinc-500">{uploading ? "Uploading to Cloudinary…" : "Max 25MB. Paste URL still works."}</span>
        {uploadError ? <span className="text-xs text-red-600">{uploadError}</span> : null}
      </div>

      {sends.length > 0 ? (
        <div className="mt-4 space-y-2">
          {sends.slice(0, 3).map((send) => (
            <div key={send.id} className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{send.text}</span>
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs">{send.status}</span>
              </div>
              {send.error ? <p className="mt-2 text-xs text-red-600">{send.error}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
