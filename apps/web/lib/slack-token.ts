import { createDb, integrationSecrets, integrations, users } from "@mark-1/db";
import { decryptSecret } from "@mark-1/integrations";
import { desc, eq } from "drizzle-orm";

export type StoredSlackSecret = {
  botToken: string;
  botUserId?: string;
  teamId?: string;
  teamName?: string;
  authedUserId?: string;
};

export type SlackSelection = {
  selectedChannels: string[];
  selectedDms: string[];
};

type SlackIntegrationMetadata = Partial<StoredSlackSecret & SlackSelection>;

const defaultUserEmail = "personal@mark-1.local";

export async function resolveSlackBotToken() {
  if (process.env.SLACK_BOT_TOKEN) return process.env.SLACK_BOT_TOKEN;
  const secret = await getStoredSlackSecret();
  return secret?.botToken;
}

export async function getStoredSlackSecret(): Promise<StoredSlackSecret | null> {
  if (!process.env.DATABASE_URL || !process.env.ENCRYPTION_KEY) return null;

  const db = createDb();
  const [row] = await db
    .select({ encryptedPayload: integrationSecrets.encryptedPayload })
    .from(integrations)
    .innerJoin(integrationSecrets, eq(integrationSecrets.integrationId, integrations.id))
    .where(eq(integrations.type, "slack"))
    .orderBy(desc(integrationSecrets.updatedAt))
    .limit(1);

  if (!row) return null;
  return decryptSecret<StoredSlackSecret>(row.encryptedPayload);
}

export async function getStoredSlackSelection(): Promise<SlackSelection> {
  if (!process.env.DATABASE_URL) return { selectedChannels: [], selectedDms: [] };

  const db = createDb();
  const [row] = await db.select({ metadata: integrations.metadata }).from(integrations).where(eq(integrations.type, "slack")).limit(1);
  const metadata = asSlackMetadata(row?.metadata);
  return {
    selectedChannels: uniqueStrings(metadata.selectedChannels),
    selectedDms: uniqueStrings(metadata.selectedDms)
  };
}

export async function saveStoredSlackSelection(selection: SlackSelection) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to save Slack selections");

  const db = createDb();
  const [existing] = await db.select({ id: integrations.id, metadata: integrations.metadata }).from(integrations).where(eq(integrations.type, "slack")).limit(1);
  const metadata = {
    ...asSlackMetadata(existing?.metadata),
    selectedChannels: uniqueStrings(selection.selectedChannels),
    selectedDms: uniqueStrings(selection.selectedDms)
  };

  if (existing) {
    await db.update(integrations).set({ metadata, updatedAt: new Date() }).where(eq(integrations.id, existing.id));
    return;
  }

  const userId = await ensureDefaultUser();
  await db.insert(integrations).values({ userId, type: "slack", status: "connected", metadata });
}

export async function ensureDefaultUser() {
  const db = createDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, process.env.APP_USER_EMAIL ?? defaultUserEmail)).limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(users)
    .values({ email: process.env.APP_USER_EMAIL ?? defaultUserEmail, name: process.env.APP_USER_NAME ?? "Personal user" })
    .returning({ id: users.id });

  if (!created) throw new Error("Failed to create default user");
  return created.id;
}

function asSlackMetadata(value: unknown): SlackIntegrationMetadata {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as SlackIntegrationMetadata) : {};
}

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim())));
}
