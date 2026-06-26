import type { ActivityItem } from "@mark-1/shared";
import { PriorityBadge, SourceBadge, StatusBadge } from "./badges";

export function ActivityCard({ item, selected = false, onSelect }: { item: ActivityItem; selected?: boolean; onSelect?: (item: ActivityItem) => void }) {
  return (
    <article className={`rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selected ? "border-black" : "border-black/10"}`}>
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
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-zinc-500">From {item.actorName}</p>
          {onSelect ? <button type="button" onClick={() => onSelect(item)} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium hover:bg-zinc-200">Details</button> : null}
        </div>
      </div>
    </article>
  );
}
