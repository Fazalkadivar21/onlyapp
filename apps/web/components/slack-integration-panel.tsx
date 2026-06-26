"use client";

import { useEffect, useState } from "react";
import { ErrorNotice, LoadingCards } from "./ui-state";

type SlackChannel = {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  selected: boolean;
  kind?: "channel" | "dm";
};

type SlackChannelsResponse = {
  configured?: boolean;
  oauthConfigured?: boolean;
  selectedChannels: string[];
  selectedDms?: string[];
  channels: SlackChannel[];
  dms?: SlackChannel[];
  error?: string;
};

export function SlackIntegrationPanel() {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedDms, setSelectedDms] = useState<string[]>([]);
  const [configured, setConfigured] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);
  const [syncResult, setSyncResult] = useState<string>();
  const [sendChannelId, setSendChannelId] = useState("");
  const [sendText, setSendText] = useState("");
  const [sendThreadTs, setSendThreadTs] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string>();

  async function loadChannels() {
    setLoading(true);
    setSyncResult(undefined);
    try {
      const response = await fetch("/api/integrations/slack/channels", { cache: "no-store" });
      const payload = (await response.json()) as SlackChannelsResponse;
      setConfigured(Boolean(payload.configured));
      setOauthConfigured(Boolean(payload.oauthConfigured));
      const nextChannels = [...(payload.channels ?? []), ...(payload.dms ?? [])];
      setChannels(nextChannels);
      setSelectedChannels(payload.selectedChannels ?? []);
      setSelectedDms(payload.selectedDms ?? []);
      setSendChannelId((current) => current || nextChannels.find((channel) => channel.selected)?.id || nextChannels[0]?.id || "");
      setError(payload.error);
    } catch (error) {
      setChannels([]);
      setSelectedChannels([]);
      setSelectedDms([]);
      setError(error instanceof Error ? error.message : "request_failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveSelection(nextChannels = selectedChannels, nextDms = selectedDms) {
    setSavingSelection(true);
    setSyncResult(undefined);
    try {
      const response = await fetch("/api/integrations/slack/channels", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectedChannels: nextChannels, selectedDms: nextDms })
      });
      const payload = (await response.json()) as { selectedChannels?: string[]; selectedDms?: string[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "selection_save_failed");
      setSelectedChannels(payload.selectedChannels ?? nextChannels);
      setSelectedDms(payload.selectedDms ?? nextDms);
      setChannels((items) => items.map((item) => ({ ...item, selected: item.kind === "dm" ? (payload.selectedDms ?? nextDms).includes(item.id) : (payload.selectedChannels ?? nextChannels).includes(item.id) })));
      setSyncResult("Slack selection saved");
    } catch (error) {
      setSyncResult(error instanceof Error ? error.message : "selection_save_failed");
    } finally {
      setSavingSelection(false);
    }
  }

  function toggleSelection(channel: SlackChannel) {
    const isDm = channel.kind === "dm";
    const current = isDm ? selectedDms : selectedChannels;
    const next = current.includes(channel.id) ? current.filter((id) => id !== channel.id) : [...current, channel.id];
    if (isDm) {
      setSelectedDms(next);
      void saveSelection(selectedChannels, next);
    } else {
      setSelectedChannels(next);
      void saveSelection(next, selectedDms);
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
        body: JSON.stringify({ channelId: sendChannelId, text: sendText.trim(), threadTs: sendThreadTs.trim() || undefined })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "slack_send_failed");
      setSendText("");
      setSendThreadTs("");
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

  const selected = channels.filter((channel) => (channel.kind === "dm" ? selectedDms : selectedChannels).includes(channel.id));

  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Slack channels</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Lists Slack channels/DMs via env token or OAuth; syncs `SLACK_SELECTED_CHANNELS` and `SLACK_SELECTED_DMS`. Set `SLACK_USER_ID` to detect personal mentions.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{configured ? "configured" : "not configured"}</span>
          {oauthConfigured ? <a href="/api/integrations/slack/oauth/start" className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium">Connect OAuth</a> : null}
          <button onClick={loadChannels} disabled={loading} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium disabled:opacity-50">Refresh</button>
          <button onClick={syncToInbox} disabled={syncing || savingSelection || (selectedChannels.length === 0 && selectedDms.length === 0)} className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{syncing ? "Syncing…" : "Sync selected"}</button>
        </div>
      </div>

      {error ? <div className="mt-4"><ErrorNotice title="Slack unavailable" message={error} action={<button onClick={loadChannels} className="rounded-full bg-red-900 px-3 py-1 text-xs font-medium text-white">Retry</button>} /></div> : null}
      {syncResult ? <p className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">{syncResult}</p> : null}
      {selectedChannels.length > 0 ? <p className="mt-4 text-xs text-zinc-500">Selected channels: {selectedChannels.join(", ")}</p> : null}
      {selectedDms.length > 0 ? <p className="mt-1 text-xs text-zinc-500">Selected DMs: {selectedDms.join(", ")}</p> : null}

      <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
        <div className="grid gap-3 md:grid-cols-[240px_1fr_auto]">
          <select value={sendChannelId} onChange={(event) => setSendChannelId(event.target.value)} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
            {channels.length === 0 ? <option>No channels loaded</option> : null}
            {(selected.length > 0 ? selected : channels).map((channel) => <option key={channel.id} value={channel.id}>{channel.kind === "dm" ? "DM" : "#"}{channel.name}</option>)}
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
        <input
          value={sendThreadTs}
          onChange={(event) => setSendThreadTs(event.target.value)}
          placeholder="Optional thread timestamp for a Slack thread reply…"
          className="mt-3 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-mono text-xs outline-none focus:border-zinc-400"
        />
        {sendResult ? <p className="mt-3 text-xs text-zinc-600">{sendResult}</p> : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {loading ? <LoadingCards count={4} className="md:col-span-2" /> : null}
        {!loading && channels.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">No channels loaded.</div> : null}
        {(selected.length > 0 ? selected : channels.slice(0, 8)).map((channel) => (
          <div key={channel.id} className="rounded-2xl border border-zinc-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium">{channel.kind === "dm" ? "DM " : "#"}{channel.name}</h3>
              <button onClick={() => toggleSelection(channel)} disabled={savingSelection} className="rounded-full bg-zinc-100 px-2 py-1 text-xs disabled:opacity-50">{(channel.kind === "dm" ? selectedDms : selectedChannels).includes(channel.id) ? "selected" : "select"}</button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">{channel.id} · {channel.isMember ? "bot is member" : "bot may need invite"}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
