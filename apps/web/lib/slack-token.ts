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
