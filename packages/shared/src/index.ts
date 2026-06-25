export type ActivitySource = "slack" | "whatsapp" | "github" | "jira";
export type ActivityStatus = "unread" | "seen" | "done" | "snoozed";
export type ActivityPriority = "low" | "normal" | "high" | "urgent";

export type ActivityItem = {
  id: string;
  source: ActivitySource;
  sourceId: string;
  type: string;
  title: string;
  body: string;
  actorName: string;
  actorAvatar?: string;
  url?: string;
  priority: ActivityPriority;
  status: ActivityStatus;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
};

export type MessageStatus = "pending" | "sent" | "failed";

export type Message = {
  id: string;
  source: "slack" | "whatsapp";
  conversationId: string;
  externalId?: string;
  senderName: string;
  body: string;
  status: MessageStatus;
  createdAt: Date;
};

export type IntegrationType = ActivitySource | "ai";
export type IntegrationStatus = "disconnected" | "connected" | "error";

export type IntegrationSummary = {
  type: IntegrationType;
  name: string;
  status: IntegrationStatus;
  description: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
};

export type AiSummary = {
  id: string;
  type: "daily_brief" | "thread" | "chat" | "pr" | "sprint";
  provider: "openai" | "anthropic" | "ollama";
  content: string;
  createdAt: Date;
};

export const mockActivityItems: ActivityItem[] = [
  {
    id: "act_1",
    source: "slack",
    sourceId: "slack_msg_1",
    type: "mention",
    title: "Mention in #engineering",
    body: "Can you review the deploy checklist before noon?",
    actorName: "Ananya",
    priority: "high",
    status: "unread",
    createdAt: new Date("2026-06-25T08:20:00Z"),
    updatedAt: new Date("2026-06-25T08:20:00Z"),
    metadata: { channel: "engineering" }
  },
  {
    id: "act_2",
    source: "whatsapp",
    sourceId: "wa_msg_1",
    type: "message",
    title: "Message in Client Ops",
    body: "The client is asking for the latest ETA on the bug fix.",
    actorName: "Rohit",
    priority: "urgent",
    status: "unread",
    createdAt: new Date("2026-06-25T08:35:00Z"),
    updatedAt: new Date("2026-06-25T08:35:00Z"),
    metadata: { chat: "Client Ops" }
  },
  {
    id: "act_3",
    source: "github",
    sourceId: "pr_42",
    type: "pull_request_review",
    title: "PR needs review",
    body: "feat: add integration settings page is waiting for your review.",
    actorName: "Maya",
    url: "https://github.com/example/repo/pull/42",
    priority: "normal",
    status: "seen",
    createdAt: new Date("2026-06-25T07:50:00Z"),
    updatedAt: new Date("2026-06-25T07:50:00Z"),
    metadata: { repo: "example/repo", pr: 42 }
  },
  {
    id: "act_4",
    source: "jira",
    sourceId: "PROJ-128",
    type: "issue_status_changed",
    title: "PROJ-128 moved to Blocked",
    body: "Payment callback issue is blocked by missing provider credentials.",
    actorName: "Jira",
    priority: "high",
    status: "unread",
    createdAt: new Date("2026-06-25T06:15:00Z"),
    updatedAt: new Date("2026-06-25T06:15:00Z"),
    metadata: { issueKey: "PROJ-128", status: "Blocked" }
  }
];
