"use client";

import { useEffect, useState } from "react";
import { ErrorNotice, LoadingCards } from "./ui-state";

type HealthStatus = "ok" | "warning" | "error" | "unknown";

type HealthPayload = {
  summary: { status: HealthStatus; errors: number; warnings: number; ok: number };
  checks: Array<{ id: string; label: string; status: HealthStatus; detail: string; updatedAt?: string }>;
  recent: {
    failedMessages: Array<{ id: string; source: string; conversationId: string; status: string; updatedAt: string }>;
    syncJobs: Array<{ id: string; source: string; status: string; error?: string | null; updatedAt: string }>;
  };
  generatedAt: string;
};

const statusClasses: Record<HealthStatus, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-100",
  warning: "bg-amber-50 text-amber-800 border-amber-100",
  error: "bg-red-50 text-red-700 border-red-100",
  unknown: "bg-zinc-50 text-zinc-700 border-zinc-100"
};

export function SyncHealthPanel() {
  const [payload, setPayload] = useState<HealthPayload>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function refresh() {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/sync-health", { cache: "no-store" });
      const next = (await response.json()) as HealthPayload & { error?: string };
      if (!response.ok) throw new Error(next.error ?? "health_check_failed");
      setPayload(next);
    } catch (error) {
      setError(error instanceof Error ? error.message : "health_check_failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Sync health</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Quick read on configured services, connector reachability, failed sends, and recent sync jobs.</p>
        </div>
        <div className="flex items-center gap-2">
          {payload ? <span className={`rounded-full border px-3 py-1 text-xs ${statusClasses[payload.summary.status]}`}>{payload.summary.status}</span> : null}
          <button onClick={refresh} disabled={loading} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium disabled:opacity-50">Refresh</button>
        </div>
      </div>

      {error ? <div className="mt-4"><ErrorNotice title="Health check failed" message={error} action={<button onClick={refresh} className="rounded-full bg-red-900 px-3 py-1 text-xs font-medium text-white">Retry</button>} /></div> : null}

      {loading ? <div className="mt-5"><LoadingCards count={3} /></div> : null}

      {!loading && payload ? (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="OK" value={payload.summary.ok} tone="ok" />
            <Metric label="Warnings" value={payload.summary.warnings} tone="warning" />
            <Metric label="Errors" value={payload.summary.errors} tone="error" />
            <Metric label="Checked" value={new Date(payload.generatedAt).toLocaleTimeString()} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {payload.checks.map((check) => (
              <div key={check.id} className={`rounded-2xl border p-4 ${statusClasses[check.status]}`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{check.label}</h3>
                  <span className="rounded-full bg-white/70 px-2 py-1 text-xs">{check.status}</span>
                </div>
                <p className="mt-2 text-xs opacity-80">{check.detail}</p>
                {check.updatedAt ? <p className="mt-2 text-xs opacity-70">Updated {new Date(check.updatedAt).toLocaleString()}</p> : null}
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <RecentList title="Recent failed sends" empty="No failed sends recorded." items={payload.recent.failedMessages.map((message) => `${message.source} → ${message.conversationId} · ${new Date(message.updatedAt).toLocaleString()}`)} />
            <RecentList title="Recent sync jobs" empty="No sync jobs recorded yet." items={payload.recent.syncJobs.map((job) => `${job.source} · ${job.status}${job.error ? ` · ${job.error}` : ""} · ${new Date(job.updatedAt).toLocaleString()}`)} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Metric({ label, value, tone = "unknown" }: { label: string; value: number | string; tone?: HealthStatus }) {
  return (
    <div className={`rounded-2xl border p-4 ${statusClasses[tone]}`}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function RecentList({ title, empty, items }: { title: string; empty: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-zinc-100 p-4">
      <h3 className="font-medium">{title}</h3>
      {items.length === 0 ? <p className="mt-3 text-sm text-zinc-500">{empty}</p> : null}
      <div className="mt-3 grid gap-2">
        {items.map((item, index) => <p key={`${item}-${index}`} className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">{item}</p>)}
      </div>
    </div>
  );
}
