"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityItem, ActivityPriority, ActivitySource, ActivityStatus } from "@mark-1/shared";
import { ActivityFeed } from "./activity-feed";
import { ErrorNotice, LoadingCards } from "./ui-state";

type ActivityItemsResponse = {
  items: Array<Omit<ActivityItem, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string }>;
  source: "database" | "mock";
  error?: string;
};

type Filter = {
  sources?: ActivitySource[];
  priorities?: ActivityPriority[];
  statuses?: ActivityStatus[];
  actionOnly?: boolean;
  q?: string;
};

const pageSize = 50;

export function ActivityFeedFromApi({ filter = {}, selectedId, itemOverrides = {}, onSelect }: { filter?: Filter; selectedId?: string; itemOverrides?: Record<string, Partial<ActivityItem>>; onSelect?: (item: ActivityItem) => void }) {
  const { items, source, error, loading, loadingMore, hasMore, retry, loadMore } = useActivityItems(filter);
  const mergedItems = useMemo(() => items.map((item) => ({ ...item, ...itemOverrides[item.id] })), [items, itemOverrides]);
  const filteredItems = useMemo(() => filterItems(mergedItems, filter), [mergedItems, filter]);

  if (loading) {
    return <LoadingCards count={5} />;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <span>Activity source: {source}{error ? ` (${error})` : ""}</span>
        {error ? <button type="button" onClick={retry} className="rounded-full border border-zinc-200 px-3 py-1 text-zinc-700 hover:bg-zinc-50">Retry</button> : null}
      </div>
      {error && items.length === 0 ? <ErrorNotice title="Activity failed to load" message="Showing no cached items. Retry when the backend is available." action={<button type="button" onClick={retry} className="rounded-full bg-red-900 px-3 py-1 text-xs font-medium text-white">Retry</button>} /> : null}
      {error && items.length === 0 ? <div className="mt-4" /> : null}
      <ActivityFeed items={filteredItems} selectedId={selectedId} onSelect={onSelect} />
      {hasMore ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ActivityStatsFromApi() {
  const { items, loading } = useActivityItems();
  const needsAttention = items.filter((item) => item.priority === "urgent" || item.priority === "high" || item.status === "unread").length;
  const sources = new Set(items.map((item) => item.source)).size;

  return (
    <section className="mb-6 grid gap-4 md:grid-cols-3">
      <div className="rounded-3xl bg-black p-6 text-white"><p className="text-sm text-white/60">Needs attention</p><p className="mt-3 text-4xl font-semibold">{loading ? "…" : needsAttention}</p></div>
      <div className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-sm text-zinc-500">Sources active</p><p className="mt-3 text-4xl font-semibold">{loading ? "…" : sources}</p></div>
      <div className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-sm text-zinc-500">AI summaries</p><p className="mt-3 text-4xl font-semibold">Mock</p></div>
    </section>
  );
}

function useActivityItems(filter: Filter = {}) {
  const queryString = toQueryString(filter);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [source, setSource] = useState<ActivityItemsResponse["source"]>("mock");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    fetchActivityItems(queryString, 0)
      .then((data) => {
        if (cancelled) return;
        setItems(toActivityItems(data.items));
        setSource(data.source);
        setError(data.error);
        setHasMore(data.items.length === pageSize);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setSource("mock");
          setError("request_failed");
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryNonce, queryString]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(undefined);

    try {
      const data = await fetchActivityItems(queryString, items.length);
      setItems((current) => [...current, ...toActivityItems(data.items)]);
      setSource(data.source);
      setError(data.error);
      setHasMore(data.items.length === pageSize);
    } catch {
      setError("request_failed");
    } finally {
      setLoadingMore(false);
    }
  }

  return { items, source, error, loading, loadingMore, hasMore, retry: () => setRetryNonce((value) => value + 1), loadMore };
}

function filterItems(items: ActivityItem[], filter: Filter) {
  return items.filter((item) => {
    if (filter.sources && !filter.sources.includes(item.source)) return false;
    if (filter.priorities && !filter.priorities.includes(item.priority)) return false;
    if (filter.statuses && !filter.statuses.includes(item.status)) return false;
    if (filter.actionOnly && item.status !== "unread" && item.priority !== "urgent" && item.priority !== "high") return false;
    if (filter.q) {
      const query = filter.q.toLowerCase();
      const haystack = `${item.title} ${item.body} ${item.actorName} ${item.type}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function toQueryString(filter: Filter) {
  const params = new URLSearchParams();
  if (filter.sources?.length) params.set("sources", filter.sources.join(","));
  if (filter.priorities?.length) params.set("priorities", filter.priorities.join(","));
  if (filter.statuses?.length) params.set("statuses", filter.statuses.join(","));
  if (filter.actionOnly) params.set("actionOnly", "true");
  if (filter.q?.trim()) params.set("q", filter.q.trim());
  const query = params.toString();
  return query ? `?${query}` : "";
}

async function fetchActivityItems(queryString: string, offset: number) {
  const pageParams = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
  const separator = queryString ? "&" : "?";
  const response = await fetch(`/api/activity-items${queryString}${separator}${pageParams.toString()}`);
  if (!response.ok) throw new Error("Activity request failed");
  return response.json() as Promise<ActivityItemsResponse>;
}

function toActivityItems(items: ActivityItemsResponse["items"]): ActivityItem[] {
  return items.map((item) => ({ ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) }));
}
