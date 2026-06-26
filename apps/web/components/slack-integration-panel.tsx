"use client";

import { useEffect, useState } from "react";

type SlackChannel = {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  selected: boolean;
};

type SlackChannelsResponse = {
  configured?: boolean;
  selectedChannels: string[];
  channels: SlackChannel[];
  error?: string;
};

export function SlackIntegrationPanel() {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>();
  const [sendChannelId, setSendChannelId] = useState("");
  const [sendText, setSendText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string>();

  async function loadChannels() {
    setLoading(true);
    setSyncResult(undefined);
    try {
      const response = await fetch("/api/integrations/slack/channels", { cache: "no-store" });
      const payload = (await response.json()) as SlackChannelsResponse;
      setConfigured(Boolean(payload.configured));
      const nextChannels = payload.channels ?? [];
      setChannels(nextChannels);
      setSelectedChannels(payload.selectedChannels ?? []);
      setSendChannelId((current) => current || nextChannels.find((channel) => channel.selected)?.id || nextChannels[0]?.id || "");
      setError(payload.error);
    } finally {
      setLoading(false);
    }
  }

  async function syncToInbox() {
    setSyncing(true);
    setSyncResult(undefined);
    try {
      const response = await fetch("/api/integrations/slack/channels", { method: "POST" });
      const payload = (await response.json()) as { created?: number; deduped?: number; total?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "sync_failed");
      setSyncResult(`Created ${payload.created ?? 0}, skipped ${payload.deduped ?? 0}`);
    } catch (error) {
      setSyncResult(error instanceof Error ? error.message : "sync_failed");
    } finally {
      setSyncing(false);
    }
  }

  async function sendMessage() {
    if (!sendChannelId || !sendText.trim()) return;

    setSending(true);
    setSendResult(undefined);
    try {
      const response = await fetch("/api/messages/slack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channelId: sendChannelId, text: sendText.trim() })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "slack_send_failed");
      setSendText("");
      setSendResult("Sent");
    } catch (error) {
      setSendResult(error instanceof Error ? error.message : "slack_send_failed");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    void loadChannels();
  }, []);

  const selected = channels.filter((channel) => channel.selected);

  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Slack channels</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Lists Slack channels via `SLACK_BOT_TOKEN`; syncs recent messages only from `SLACK_SELECTED_CHANNELS`. Set `SLACK_USER_ID` to detect personal mentions.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{configured ? "configured" : "not configured"}</span>
          <button onClick={loadChannels} disabled={loading} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium disabled:opacity-50">Refresh</button>
          <button onClick={syncToInbox} disabled={syncing || selectedChannels.length === 0} className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{syncing ? "Syncing…" : "Sync selected"}</button>
        </div>
      </div>

      {error ? <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p> : null}
      {syncResult ? <p className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">{syncResult}</p> : null}
      {selectedChannels.length > 0 ? <p className="mt-4 text-xs text-zinc-500">Selected from env: {selectedChannels.join(", ")}</p> : null}

      <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
        <div className="grid gap-3 md:grid-cols-[240px_1fr_auto]">
          <select value={sendChannelId} onChange={(event) => setSendChannelId(event.target.value)} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
            {channels.length === 0 ? <option>No channels loaded</option> : null}
            {(selected.length > 0 ? selected : channels).map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
          </select>
          <input
            value={sendText}
            onChange={(event) => setSendText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) void sendMessage();
            }}
            placeholder="Send a Slack message…"
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400"
          />
          <button onClick={sendMessage} disabled={sending || !sendChannelId || !sendText.trim()} className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-40">{sending ? "Sending…" : "Send"}</button>
        </div>
        {sendResult ? <p className="mt-3 text-xs text-zinc-600">{sendResult}</p> : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {loading ? <div className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-500">Loading Slack channels…</div> : null}
        {!loading && channels.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">No channels loaded.</div> : null}
        {(selected.length > 0 ? selected : channels.slice(0, 8)).map((channel) => (
          <div key={channel.id} className="rounded-2xl border border-zinc-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium">#{channel.name}</h3>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{channel.selected ? "selected" : channel.isPrivate ? "private" : "public"}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">{channel.id} · {channel.isMember ? "bot is member" : "bot may need invite"}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
