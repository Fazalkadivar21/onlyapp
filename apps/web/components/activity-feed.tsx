import type { ActivityItem } from "@mark-1/shared";
import { ActivityCard } from "./activity-card";

export function ActivityFeed({ items, selectedId, onSelect }: { items: ActivityItem[]; selectedId?: string; onSelect?: (item: ActivityItem) => void }) {
  if (items.length === 0) {
    return <div className="rounded-3xl border border-dashed border-black/20 bg-white/60 p-10 text-center text-sm text-zinc-500">Nothing needs attention.</div>;
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <ActivityCard key={item.id} item={item} selected={item.id === selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}
