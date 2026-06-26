import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const scopes = [
  "channels:read",
  "groups:read",
  "im:read",
  "channels:history",
  "groups:history",
  "im:history",
  "users:read",
  "chat:write"
];

export async function GET(request: Request) {
  if (!process.env.SLACK_CLIENT_ID) {
    return Response.json({ error: "SLACK_CLIENT_ID is required" }, { status: 503 });
  }

  const state = randomBytes(24).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("slack_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    maxAge: 10 * 60,
    path: "/"
  });

  const redirectUri = getRedirectUri(request);
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", process.env.SLACK_CLIENT_ID);
  url.searchParams.set("scope", scopes.join(","));
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);

  return Response.redirect(url);
}

function getRedirectUri(request: Request) {
  if (process.env.SLACK_OAUTH_REDIRECT_URI) return process.env.SLACK_OAUTH_REDIRECT_URI;
  const baseUrl = process.env.APP_URL || new URL(request.url).origin;
  return `${baseUrl.replace(/\/$/, "")}/api/integrations/slack/oauth/callback`;
}
