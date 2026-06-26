"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityItem, ActivityPriority, ActivitySource, ActivityStatus } from "@mark-1/shared";
import { ActivityFeed } from "./activity-feed";

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
};

export function ActivityFeedFromApi({ filter = {}, selectedId, itemOverrides = {}, onSelect }: { filter?: Filter; selectedId?: string; itemOverrides?: Record<string, Partial<ActivityItem>>; onSelect?: (item: ActivityItem) => void }) {
  const { items, source, error, loading } = useActivityItems();
  const mergedItems = useMemo(() => items.map((item) => ({ ...item, ...itemOverrides[item.id] })), [items, itemOverrides]);
  const filteredItems = useMemo(() => filterItems(mergedItems, filter), [mergedItems, filter]);

  if (loading) {
    return <div className="rounded-3xl bg-white p-6 text-sm text-zinc-500 shadow-sm">Loading activity…</div>;
  }

  return (
    <div>
      <div className="mb-3 text-xs text-zinc-500">Activity source: {source}{error ? ` (${error})` : ""}</div>
      <ActivityFeed items={filteredItems} selectedId={selectedId} onSelect={onSelect} />
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

function useActivityItems() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [source, setSource] = useState<ActivityItemsResponse["source"]>("mock");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/activity-items")
      .then((response) => response.json() as Promise<ActivityItemsResponse>)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items.map((item) => ({ ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) })));
        setSource(data.source);
        setError(data.error);
      })
      .catch(() => {
        if (!cancelled) setError("request_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { items, source, error, loading };
}

function filterItems(items: ActivityItem[], filter: Filter) {
  return items.filter((item) => {
    if (filter.sources && !filter.sources.includes(item.source)) return false;
    if (filter.priorities && !filter.priorities.includes(item.priority)) return false;
    if (filter.statuses && !filter.statuses.includes(item.status)) return false;
    if (filter.actionOnly && item.status !== "unread" && item.priority !== "urgent" && item.priority !== "high") return false;
    return true;
  });
}
