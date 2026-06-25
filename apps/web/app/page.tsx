import { ActivityFeedFromApi, ActivityStatsFromApi } from "@/components/activity-feed-from-api";
import { PageHeader } from "@/components/page-header";

export default function HomePage() {
  return (
    <div>
      <PageHeader title="Home" description="A fast overview of messages, PRs, Jira movement, and notes." />
      <ActivityStatsFromApi />
      <ActivityFeedFromApi />
    </div>
  );
}
