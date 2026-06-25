import { ActivityFeedFromApi } from "@/components/activity-feed-from-api";
import { PageHeader } from "@/components/page-header";

export default function QueuePage() {
  return (
    <div>
      <PageHeader title="Action Queue" description="Normalized work items that likely require a response, decision, review, or follow-up." />
      <ActivityFeedFromApi filter={{ actionOnly: true }} />
    </div>
  );
}
