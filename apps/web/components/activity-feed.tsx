import type { ActivityItem } from "@mark-1/shared";
import { ActivityCard } from "./activity-card";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <div className="rounded-3xl border border-dashed border-black/20 bg-white/60 p-10 text-center text-sm text-zinc-500">Nothing needs attention.</div>;
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <ActivityCard key={item.id} item={item} />
      ))}
    </div>
  );
}
