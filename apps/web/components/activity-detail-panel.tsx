"use client";

import { useState } from "react";
import type { ActivityItem, ActivityStatus } from "@mark-1/shared";
import { PriorityBadge, SourceBadge, StatusBadge } from "./badges";

type ReplyTarget = {
  chatId: string;
  draft?: string;
};

export function ActivityDetailPanel({ item, onReply, onStatusChange, onCreateNote }: { item?: ActivityItem; onReply: (target: ReplyTarget) => void; onStatusChange: (status: ActivityStatus) => void; onCreateNote: (item: ActivityItem) => void }) {
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string>();

  async function draftReply(target: ReplyTarget) {
    if (!item) return;
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
      onReply({ ...target, draft: payload.draft ?? target.draft });
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "draft_failed");
    } finally {
      setDrafting(false);
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
              onClick={() => void draftReply({ chatId: whatsappChatId, draft: `Re: ${item.actorName} — ` })}
              disabled={drafting}
              className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium disabled:opacity-50"
            >
              {drafting ? "Drafting…" : "Draft AI reply"}
            </button>
            {draftError ? <p className="text-xs text-amber-700">Draft failed: {draftError}</p> : null}
          </div>
        ) : (
          <button type="button" disabled className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-400">
            Reply action not wired for {item.source}
          </button>
        )}
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
