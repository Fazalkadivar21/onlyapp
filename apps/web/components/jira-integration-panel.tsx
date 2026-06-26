"use client";

import { useEffect, useState } from "react";

type JiraIssue = {
  id: string;
  key: string;
  summary: string;
  status: string;
  assignee?: string;
  priority?: string;
  url: string;
  updatedAt: string;
};

type JiraSprint = {
  id: number;
  name: string;
  state: string;
};

type JiraResponse = {
  configured?: boolean;
  sprint?: JiraSprint;
  issues: JiraIssue[];
  error?: string;
};

export function JiraIntegrationPanel() {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [sprint, setSprint] = useState<JiraSprint>();
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>();

  async function loadIssues() {
    setLoading(true);
    setSyncResult(undefined);
    try {
      const response = await fetch("/api/integrations/jira/issues", { cache: "no-store" });
      const payload = (await response.json()) as JiraResponse;
      setConfigured(Boolean(payload.configured));
      setSprint(payload.sprint);
      setIssues(payload.issues ?? []);
      setError(payload.error);
    } finally {
      setLoading(false);
    }
  }

  async function syncToInbox() {
    setSyncing(true);
    setSyncResult(undefined);
    try {
      const response = await fetch("/api/integrations/jira/issues", { method: "POST" });
      const payload = (await response.json()) as { created?: number; deduped?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "sync_failed");
      setSyncResult(`Created ${payload.created ?? 0}, skipped ${payload.deduped ?? 0}`);
    } catch (error) {
      setSyncResult(error instanceof Error ? error.message : "sync_failed");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    void loadIssues();
  }, []);

  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Jira Sprint / Issues</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Uses `JIRA_BOARD_ID` for active sprint issues, or `JIRA_PROJECT_KEY` for assigned issues.</p>
          {sprint ? <p className="mt-1 text-sm font-medium text-zinc-700">Active sprint: {sprint.name}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{configured ? "configured" : "not configured"}</span>
          <button onClick={loadIssues} disabled={loading} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium disabled:opacity-50">Refresh</button>
          <button onClick={syncToInbox} disabled={syncing || issues.length === 0} className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{syncing ? "Syncing…" : "Sync to inbox"}</button>
        </div>
      </div>

      {error ? <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p> : null}
      {syncResult ? <p className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">{syncResult}</p> : null}

      <div className="mt-5 grid gap-3">
        {loading ? <div className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-500">Loading Jira issues…</div> : null}
        {!loading && issues.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">No Jira issues loaded.</div> : null}
        {issues.slice(0, 8).map((issue) => (
          <a key={issue.id} href={issue.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-zinc-100 p-4 transition hover:border-zinc-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{issue.key}: {issue.summary}</h3>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{issue.status}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">{issue.assignee ? `Assigned to ${issue.assignee}` : "Unassigned"}{issue.priority ? ` · ${issue.priority}` : ""} · updated {new Date(issue.updatedAt).toLocaleString()}</p>
          </a>
        ))}
      </div>
    </article>
  );
}
