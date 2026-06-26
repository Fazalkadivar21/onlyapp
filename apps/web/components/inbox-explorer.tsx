"use client";

import { useState } from "react";
import type { ActivityItem, ActivitySource, ActivityStatus } from "@mark-1/shared";
import { ActivityDetailPanel } from "./activity-detail-panel";
import { ActivityFeedFromApi } from "./activity-feed-from-api";
import { WhatsAppComposer } from "./whatsapp-composer";
import { cn } from "@/lib/utils";

const filters: Array<"all" | ActivitySource> = ["all", "slack", "whatsapp", "github", "jira"];

export function InboxExplorer() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("all");
  const [selectedItem, setSelectedItem] = useState<ActivityItem | undefined>();
  const [itemOverrides, setItemOverrides] = useState<Record<string, Partial<ActivityItem>>>({});
  const [replyTarget, setReplyTarget] = useState<{ chatId: string; draft?: string; nonce: number } | undefined>();
  const filter = activeFilter === "all" ? {} : { sources: [activeFilter] };

  async function createLinkedNote(item: ActivityItem) {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ activityItemId: item.id })
    });

    if (response.ok) {
      window.location.href = "/notes";
    }
  }

  async function updateSelectedStatus(status: ActivityStatus) {
    if (!selectedItem) return;

    setSelectedItem({ ...selectedItem, status });
    setItemOverrides((current) => ({ ...current, [selectedItem.id]: { ...current[selectedItem.id], status } }));

    const response = await fetch("/api/activity-items", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: selectedItem.id, status })
    });

    if (!response.ok && response.status !== 503) {
      const previousStatus = selectedItem.status;
      setSelectedItem({ ...selectedItem, status: previousStatus });
      setItemOverrides((current) => ({ ...current, [selectedItem.id]: { ...current[selectedItem.id], status: previousStatus } }));
    }
  }

  return (
    <div>
      <WhatsAppComposer replyTarget={replyTarget} />
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
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ActivityFeedFromApi filter={filter} selectedId={selectedItem?.id} itemOverrides={itemOverrides} onSelect={setSelectedItem} />
        <ActivityDetailPanel
          item={selectedItem}
          onReply={(target) => setReplyTarget({ ...target, nonce: Date.now() })}
          onStatusChange={(status) => void updateSelectedStatus(status)}
          onCreateNote={(item) => void createLinkedNote(item)}
        />
      </div>
    </div>
  );
}
