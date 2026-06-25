import type { ActivityPriority, ActivitySource, ActivityStatus } from "@mark-1/shared";
import { cn } from "@/lib/utils";

const sourceStyles: Record<ActivitySource, string> = {
  slack: "bg-violet-100 text-violet-800",
  whatsapp: "bg-emerald-100 text-emerald-800",
  github: "bg-zinc-200 text-zinc-900",
  jira: "bg-blue-100 text-blue-800"
};

const priorityStyles: Record<ActivityPriority, string> = {
  low: "bg-zinc-100 text-zinc-600",
  normal: "bg-sky-100 text-sky-700",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

const statusStyles: Record<ActivityStatus, string> = {
  unread: "bg-black text-white",
  seen: "bg-zinc-100 text-zinc-700",
  done: "bg-green-100 text-green-800",
  snoozed: "bg-amber-100 text-amber-800"
};

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("rounded-full px-2 py-1 text-xs font-medium", className)}>{children}</span>;
}

export function SourceBadge({ source }: { source: ActivitySource }) {
  return <Badge className={sourceStyles[source]}>{source}</Badge>;
}

export function PriorityBadge({ priority }: { priority: ActivityPriority }) {
  return <Badge className={priorityStyles[priority]}>{priority}</Badge>;
}

export function StatusBadge({ status }: { status: ActivityStatus }) {
  return <Badge className={statusStyles[status]}>{status}</Badge>;
}
