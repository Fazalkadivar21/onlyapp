import { ActivityFeedFromApi } from "@/components/activity-feed-from-api";
import { DailyBriefPanel } from "@/components/daily-brief-panel";
import { PageHeader } from "@/components/page-header";

export default function DailyBriefPage() {
  return (
    <div>
      <PageHeader title="Daily Brief" description="Morning summary from cached activity. Uses configured AI provider, with heuristic fallback." />
      <DailyBriefPanel />
      <ActivityFeedFromApi filter={{ priorities: ["urgent", "high"] }} />
    </div>
  );
}
