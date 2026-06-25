import type { ActivityItem, ActivitySource } from "@mark-1/shared";

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

export interface AiProvider {
  name: "openai" | "anthropic" | "ollama";
  summarize(prompt: string): Promise<string>;
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
