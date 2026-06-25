"use client";

import { useState } from "react";
import type { ActivitySource } from "@mark-1/shared";
import { ActivityFeedFromApi } from "./activity-feed-from-api";
import { cn } from "@/lib/utils";

const filters: Array<"all" | ActivitySource> = ["all", "slack", "whatsapp", "github", "jira"];

export function InboxExplorer() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("all");
  const filter = activeFilter === "all" ? {} : { sources: [activeFilter] };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        {filters.map((source) => (
          <button
            key={source}
            type="button"
            onClick={() => setActiveFilter(source)}
            className={cn(
              "rounded-full px-3 py-2 shadow-sm transition",
              activeFilter === source ? "bg-black text-white" : "bg-white text-zinc-700 hover:bg-zinc-100"
            )}
          >
            {source}
          </button>
        ))}
      </div>
      <ActivityFeedFromApi filter={filter} />
    </div>
  );
}
