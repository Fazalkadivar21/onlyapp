import { InboxExplorer } from "@/components/inbox-explorer";
import { PageHeader } from "@/components/page-header";

export default function InboxPage() {
  return (
    <div>
      <PageHeader title="Unified Inbox" description="All normalized activity across selected channels, chats, repos, and sprint sources." />
      <InboxExplorer />
    </div>
  );
}
