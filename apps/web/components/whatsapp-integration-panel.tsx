"use client";

import { useEffect, useMemo, useState } from "react";

type WhatsAppState = {
  status: string;
  qr?: string | null;
  lastError?: string | null;
  sessionDir?: string;
  chats?: number;
  selectedChats?: number;
};

type ChatSummary = {
  id: string;
  name?: string;
  unreadCount?: number;
  updatedAt?: number;
  selected?: boolean;
};

type WhatsAppPayload = {
  configured?: boolean;
  state?: WhatsAppState;
  qrDataUrl?: string | null;
  chats?: ChatSummary[];
  error?: string;
};

export function WhatsAppIntegrationPanel() {
  const [payload, setPayload] = useState<WhatsAppPayload>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/whatsapp", { cache: "no-store" });
      const next = (await response.json()) as WhatsAppPayload;
      setPayload(next);
      setSelected(new Set((next.chats ?? []).filter((chat) => chat.selected).map((chat) => chat.id)));
    } finally {
      setLoading(false);
    }
  }

  async function connect() {
    setLoading(true);
    try {
      await fetch("/api/integrations/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "connect" })
      });
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function saveSelectedChats() {
    setSaving(true);
    try {
      await fetch("/api/integrations/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set-selected-chats", chatIds: [...selected] })
      });
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const sortedChats = useMemo(() => payload.chats ?? [], [payload.chats]);
  const status = payload.state?.status ?? (payload.configured === false ? "not configured" : "unknown");

  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">WhatsApp</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Connect with QR, then choose the chats/groups that are allowed into mark-1.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{status}</span>
          <button onClick={refresh} disabled={loading} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium disabled:opacity-50">Refresh</button>
          <button onClick={connect} disabled={loading || payload.configured === false} className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Connect</button>
        </div>
      </div>

      {payload.error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{payload.error}</p> : null}

      {payload.qrDataUrl ? (
        <div className="mt-5 flex flex-wrap items-center gap-5 rounded-2xl border border-dashed border-zinc-300 p-4">
          <img src={payload.qrDataUrl} alt="WhatsApp QR code" className="h-60 w-60 rounded-xl bg-white" />
          <p className="max-w-md text-sm leading-6 text-zinc-600">Scan this in WhatsApp → Linked devices. Refresh after scanning to load chats.</p>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-4">
        <h3 className="font-semibold">Allowed chats/groups</h3>
        <button onClick={saveSelectedChats} disabled={saving || payload.configured === false} className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Saving…" : `Save ${selected.size}`}</button>
      </div>

      <div className="mt-3 max-h-96 overflow-auto rounded-2xl border border-zinc-200">
        {sortedChats.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No chats loaded yet. Connect WhatsApp, then refresh.</p>
        ) : (
          sortedChats.map((chat) => (
            <label key={chat.id} className="flex cursor-pointer items-center gap-3 border-b border-zinc-100 p-4 last:border-b-0">
              <input
                type="checkbox"
                checked={selected.has(chat.id)}
                onChange={(event) => {
                  const next = new Set(selected);
                  if (event.target.checked) next.add(chat.id);
                  else next.delete(chat.id);
                  setSelected(next);
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{chat.name ?? chat.id}</span>
                <span className="block truncate font-mono text-xs text-zinc-500">{chat.id}</span>
              </span>
              {chat.unreadCount ? <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{chat.unreadCount}</span> : null}
            </label>
          ))
        )}
      </div>
    </article>
  );
}
