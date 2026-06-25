import type { ActivityItem } from "@mark-1/shared";
import { PriorityBadge, SourceBadge, StatusBadge } from "./badges";

export function ActivityCard({ item }: { item: ActivityItem }) {
  return (
    <article className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SourceBadge source={item.source} />
        <PriorityBadge priority={item.priority} />
        <StatusBadge status={item.status} />
      </div>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-base font-semibold">{item.title}</h3>
          <time className="shrink-0 text-xs text-zinc-500">{item.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
        </div>
        <p className="text-sm leading-6 text-zinc-700">{item.body}</p>
        <p className="text-xs font-medium text-zinc-500">From {item.actorName}</p>
      </div>
    </article>
  );
}
