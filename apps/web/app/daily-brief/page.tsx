import { ActivityFeedFromApi } from "@/components/activity-feed-from-api";
import { PageHeader } from "@/components/page-header";

export default function DailyBriefPage() {
  return (
    <div>
      <PageHeader title="Daily Brief" description="Morning summary from Slack, WhatsApp, GitHub, Jira, and notes. AI-backed generation will land after the queue is wired." />
      <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Mock brief</h2>
        <p className="mt-2 text-zinc-600">Client ETA is urgent, one Jira issue is blocked, and one PR is waiting for review. Start with WhatsApp Client Ops, then unblock PROJ-128.</p>
      </div>
      <ActivityFeedFromApi filter={{ priorities: ["urgent", "high"] }} />
    </div>
  );
}
