import type { ActivityItem, ActivitySource } from "@mark-1/shared";

export { createAiProvider, type AiProviderName } from "./ai";
export { fetchGitHubPullRequests, normalizeGitHubPullRequest, type GitHubPullRequest } from "./github";
export { fetchJiraActiveSprintIssues, normalizeJiraIssue, type JiraIssue, type JiraSprint } from "./jira";
export { fetchSlackChannels, fetchSlackSelectedChannelMessages, normalizeSlackMessage, parseSlackSelectedChannels, type SlackChannel, type SlackMessage } from "./slack";
export { deleteMedia, configureCloudinary, getCloudinaryConfig, uploadMedia, type CloudinaryConfig, type UploadMediaInput } from "./media";
export { decryptSecret, encryptSecret, type EncryptedSecret } from "./secrets";

export type NormalizedExternalEvent = Omit<ActivityItem, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type SendMessageInput = {
  conversationId: string;
  body: string;
  threadId?: string;
};

export type SendMessageResult = {
  externalId: string;
  sentAt: Date;
};

export interface MessagingIntegration {
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
}

export interface SyncIntegration {
  source: ActivitySource;
  sync(): Promise<NormalizedExternalEvent[]>;
}

export function normalizeEvent(event: NormalizedExternalEvent): ActivityItem {
  const now = new Date();
  return {
    id: event.id ?? crypto.randomUUID(),
    createdAt: event.createdAt ?? now,
    updatedAt: event.updatedAt ?? now,
    ...event
  };
}

export class NotImplementedMessagingIntegration implements MessagingIntegration {
  constructor(private readonly label: string) {}

  async sendMessage(): Promise<SendMessageResult> {
    throw new Error(`${this.label} messaging is not implemented yet`);
  }
}

export const slackIntegration = new NotImplementedMessagingIntegration("Slack");
export const whatsAppIntegration = new NotImplementedMessagingIntegration("WhatsApp");
