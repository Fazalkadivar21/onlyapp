"use client";

import { useEffect, useState } from "react";
import type { ActivityItem, ActivityStatus } from "@mark-1/shared";
import { PriorityBadge, SourceBadge, StatusBadge } from "./badges";

type ReplyTarget = {
  chatId: string;
  draft?: string;
};

export function ActivityDetailPanel({ item, onReply, onStatusChange, onCreateNote }: { item?: ActivityItem; onReply: (target: ReplyTarget) => void; onStatusChange: (status: ActivityStatus) => void; onCreateNote: (item: ActivityItem) => void }) {
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string>();
  const [slackDraft, setSlackDraft] = useState("");
  const [slackSending, setSlackSending] = useState(false);
  const [slackResult, setSlackResult] = useState<string>();
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string>();
  const [summaryError, setSummaryError] = useState<string>();

  useEffect(() => {
    setSlackDraft("");
    setSlackResult(undefined);
    setDraftError(undefined);
    setSummary(undefined);
    setSummaryError(undefined);
  }, [item?.id]);

  async function generateReplyDraft() {
    if (!item) return undefined;
    setDrafting(true);
    setDraftError(undefined);

    try {
      const response = await fetch("/api/ai/reply-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: item.source, title: item.title, body: item.body, actorName: item.actorName })
      });
      const payload = (await response.json()) as { draft?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "draft_failed");
      return payload.draft;
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "draft_failed");
      return undefined;
    } finally {
      setDrafting(false);
    }
  }

  async function summarizeActivity() {
    if (!item) return;
    setSummarizing(true);
    setSummaryError(undefined);

    try {
      const response = await fetch("/api/ai/activity-summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: item.source, type: item.type, title: item.title, body: item.body, actorName: item.actorName, metadata: item.metadata })
      });
      const payload = (await response.json()) as { summary?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "summary_failed");
      setSummary(payload.summary ?? "No summary generated.");
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "summary_failed");
    } finally {
      setSummarizing(false);
    }
  }

  async function sendSlackReply(channelId: string, threadTs?: string) {
    if (!slackDraft.trim()) return;
    setSlackSending(true);
    setSlackResult(undefined);

    try {
      const response = await fetch("/api/messages/slack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channelId, threadTs, text: slackDraft.trim() })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "slack_send_failed");
      setSlackDraft("");
      setSlackResult("Slack reply sent.");
    } catch (error) {
      setSlackResult(error instanceof Error ? error.message : "slack_send_failed");
    } finally {
      setSlackSending(false);
    }
  }

  if (!item) {
    return (
      <aside className="rounded-3xl border border-dashed border-zinc-300 bg-white/70 p-6 text-sm text-zinc-500">
        Select an activity item to see details and quick actions.
      </aside>
    );
  }

  const whatsappChatId = item.source === "whatsapp" ? stringMetadata(item.metadata, "chatId") : undefined;
  const slackChannelId = item.source === "slack" ? stringMetadata(item.metadata, "channelId") : undefined;
  const slackThreadTs = item.source === "slack" ? (stringMetadata(item.metadata, "threadTs") ?? stringMetadata(item.metadata, "ts")) : undefined;

  return (
    <aside className="sticky top-5 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <SourceBadge source={item.source} />
        <PriorityBadge priority={item.priority} />
        <StatusBadge status={item.status} />
      </div>

      <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-700">{item.body}</p>

      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">Actor</dt>
          <dd className="mt-1 font-medium">{item.actorName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">Created</dt>
          <dd className="mt-1 font-medium">{item.createdAt.toLocaleString()}</dd>
        </div>
        {whatsappChatId ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-400">WhatsApp chat</dt>
            <dd className="mt-1 break-all font-mono text-xs">{whatsappChatId}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6 grid gap-2">
        <button
          type="button"
          onClick={() => void summarizeActivity()}
          disabled={summarizing}
          className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium disabled:opacity-50"
        >
          {summarizing ? "Summarizing…" : "Summarize with AI"}
        </button>
        {summary ? <div className="whitespace-pre-wrap rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">{summary}</div> : null}
        {summaryError ? <p className="text-xs text-amber-700">Summary failed: {summaryError}</p> : null}
        <div className="grid grid-cols-3 gap-2">
          {(["seen", "done", "snoozed"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusChange(status)}
              disabled={item.status === status}
              className="rounded-2xl bg-zinc-100 px-3 py-2 text-xs font-medium hover:bg-zinc-200 disabled:opacity-40"
            >
              {status}
            </button>
          ))}
        </div>
        {whatsappChatId ? (
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => onReply({ chatId: whatsappChatId, draft: `Re: ${item.actorName} — ` })}
              className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white"
            >
              Reply on WhatsApp
            </button>
            <button
              type="button"
              onClick={async () => {
                const draft = await generateReplyDraft();
                onReply({ chatId: whatsappChatId, draft: draft ?? `Re: ${item.actorName} — ` });
              }}
              disabled={drafting}
              className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium disabled:opacity-50"
            >
              {drafting ? "Drafting…" : "Draft AI reply"}
            </button>
            {draftError ? <p className="text-xs text-amber-700">Draft failed: {draftError}</p> : null}
          </div>
        ) : null}
        {slackChannelId ? (
          <div className="grid gap-2 rounded-2xl border border-zinc-100 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Slack reply</p>
            <textarea
              value={slackDraft}
              onChange={(event) => setSlackDraft(event.target.value)}
              placeholder="Write a Slack reply…"
              rows={3}
              className="w-full resize-none rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => setSlackDraft((await generateReplyDraft()) ?? "")}
                disabled={drafting}
                className="rounded-2xl border border-zinc-200 px-3 py-2 text-xs font-medium disabled:opacity-50"
              >
                {drafting ? "Drafting…" : "AI draft"}
              </button>
              <button
                type="button"
                onClick={() => void sendSlackReply(slackChannelId, slackThreadTs)}
                disabled={slackSending || !slackDraft.trim()}
                className="rounded-2xl bg-black px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {slackSending ? "Sending…" : "Send"}
              </button>
            </div>
            {slackResult ? <p className="text-xs text-zinc-500">{slackResult}</p> : null}
            {draftError ? <p className="text-xs text-amber-700">Draft failed: {draftError}</p> : null}
          </div>
        ) : null}
        {!whatsappChatId && !slackChannelId ? (
          <button type="button" disabled className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-400">
            Reply action not wired for {item.source}
          </button>
        ) : null}
        <button type="button" onClick={() => onCreateNote(item)} className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium">Create linked note</button>
        {item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-zinc-200 px-4 py-3 text-center text-sm font-medium">Open source</a> : null}
      </div>
    </aside>
  );
}

function stringMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
