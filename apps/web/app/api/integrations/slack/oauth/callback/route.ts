import { integrationSecrets, integrations } from "@mark-1/db";
import { encryptSecret } from "@mark-1/integrations";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { ensureDefaultUser, type StoredSlackSecret } from "@/lib/slack-token";

export const dynamic = "force-dynamic";

type SlackOAuthResponse = {
  ok: boolean;
  error?: string;
  access_token?: string;
  bot_user_id?: string;
  authed_user?: { id?: string };
  team?: { id?: string; name?: string };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("slack_oauth_state")?.value;
  cookieStore.delete("slack_oauth_state");

  const appUrl = process.env.APP_URL || url.origin;
  const doneUrl = `${appUrl.replace(/\/$/, "")}/integrations`;

  if (!code || !state || !expectedState || state !== expectedState) {
    return Response.redirect(`${doneUrl}?slack=oauth_state_failed`);
  }

  if (!process.env.DATABASE_URL || !process.env.ENCRYPTION_KEY) {
    return Response.redirect(`${doneUrl}?slack=missing_database_or_encryption_key`);
  }

  try {
    const payload = await exchangeCode(code, getRedirectUri(request));
    if (!payload.access_token) throw new Error("Slack did not return a bot access token");

    const db = (await import("@mark-1/db")).createDb();
    const userId = await ensureDefaultUser();
    const [existing] = await db.select({ id: integrations.id }).from(integrations).where(eq(integrations.type, "slack")).limit(1);
    const metadata = { teamId: payload.team?.id, teamName: payload.team?.name, botUserId: payload.bot_user_id, authedUserId: payload.authed_user?.id };
    const integrationId = existing?.id ?? (await db.insert(integrations).values({ userId, type: "slack", status: "connected", metadata }).returning({ id: integrations.id }))[0]?.id;

    if (!integrationId) throw new Error("Failed to create Slack integration");
    await db.update(integrations).set({ status: "connected", metadata, updatedAt: new Date() }).where(eq(integrations.id, integrationId));

    const secret: StoredSlackSecret = {
      botToken: payload.access_token,
      botUserId: payload.bot_user_id,
      teamId: payload.team?.id,
      teamName: payload.team?.name,
      authedUserId: payload.authed_user?.id
    };
    await db.insert(integrationSecrets).values({ integrationId, encryptedPayload: encryptSecret(secret) });

    return Response.redirect(`${doneUrl}?slack=connected`);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "slack_oauth_failed");
    return Response.redirect(`${doneUrl}?slack=${reason}`);
  }
}

async function exchangeCode(code: string, redirectUri: string) {
  if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) throw new Error("Slack OAuth env is incomplete");

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) throw new Error(`Slack OAuth exchange failed: ${response.status}`);
  const payload = (await response.json()) as SlackOAuthResponse;
  if (!payload.ok) throw new Error(payload.error ?? "slack_oauth_failed");
  return payload;
}

function getRedirectUri(request: Request) {
  if (process.env.SLACK_OAUTH_REDIRECT_URI) return process.env.SLACK_OAUTH_REDIRECT_URI;
  const baseUrl = process.env.APP_URL || new URL(request.url).origin;
  return `${baseUrl.replace(/\/$/, "")}/api/integrations/slack/oauth/callback`;
}
