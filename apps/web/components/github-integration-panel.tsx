"use client";

import { useEffect, useState } from "react";

type GitHubPullRequest = {
  id: number;
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  repository: string;
  author: string;
  draft: boolean;
  updatedAt: string;
};

type PullRequestResponse = {
  configured?: boolean;
  pullRequests: GitHubPullRequest[];
  error?: string;
};

export function GitHubIntegrationPanel() {
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [error, setError] = useState<string>();
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>();

  async function loadPullRequests() {
    setLoading(true);
    setSyncResult(undefined);
    try {
      const response = await fetch("/api/integrations/github/prs", { cache: "no-store" });
      const payload = (await response.json()) as PullRequestResponse;
      setConfigured(Boolean(payload.configured));
      setPullRequests(payload.pullRequests ?? []);
      setError(payload.error);
    } finally {
      setLoading(false);
    }
  }

  async function syncToInbox() {
    setSyncing(true);
    setSyncResult(undefined);
    try {
      const response = await fetch("/api/integrations/github/prs", { method: "POST" });
      const payload = (await response.json()) as { created?: number; deduped?: number; total?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "sync_failed");
      setSyncResult(`Created ${payload.created ?? 0}, skipped ${payload.deduped ?? 0}`);
    } catch (error) {
      setSyncResult(error instanceof Error ? error.message : "sync_failed");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    void loadPullRequests();
  }, []);

  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">GitHub PRs</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Lists open PRs via `GITHUB_TOKEN`; optionally scope with `GITHUB_REPOSITORIES=owner/repo,owner/repo`.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{configured ? "configured" : "not configured"}</span>
          <button onClick={loadPullRequests} disabled={loading} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium disabled:opacity-50">Refresh</button>
          <button onClick={syncToInbox} disabled={syncing || pullRequests.length === 0} className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{syncing ? "Syncing…" : "Sync to inbox"}</button>
        </div>
      </div>

      {error ? <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p> : null}
      {syncResult ? <p className="mt-4 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">{syncResult}</p> : null}

      <div className="mt-5 grid gap-3">
        {loading ? <div className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-500">Loading PRs…</div> : null}
        {!loading && pullRequests.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">No PRs loaded.</div> : null}
        {pullRequests.slice(0, 8).map((pr) => (
          <a key={pr.id} href={pr.htmlUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-zinc-100 p-4 transition hover:border-zinc-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{pr.repository}#{pr.number}: {pr.title}</h3>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">{pr.draft ? "draft" : pr.state}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">By {pr.author} · updated {new Date(pr.updatedAt).toLocaleString()}</p>
          </a>
        ))}
      </div>
    </article>
  );
}
