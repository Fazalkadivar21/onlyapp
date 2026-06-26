import type { ActivityItem, ActivityPriority } from "@mark-1/shared";

export type SlackChannel = {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  selected: boolean;
};

export type SlackMessage = {
  id: string;
  channelId: string;
  channelName: string;
  text: string;
  userId?: string;
  userName: string;
  ts: string;
  threadTs?: string;
  permalink?: string;
  mentionedCurrentUser: boolean;
};

type SlackListResponse<T> = {
  ok: boolean;
  error?: string;
  response_metadata?: { next_cursor?: string };
} & T;

type SlackConversation = {
  id: string;
  name?: string;
  is_private?: boolean;
  is_member?: boolean;
  is_archived?: boolean;
};

type SlackHistoryMessage = {
  type?: string;
  subtype?: string;
  user?: string;
  username?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
};

type SlackUser = {
  id: string;
  name?: string;
  real_name?: string;
  profile?: { display_name?: string; real_name?: string };
};

export function parseSlackSelectedChannels(value = process.env.SLACK_SELECTED_CHANNELS) {
  return (value ?? "")
    .split(",")
    .map((channel) => channel.trim())
    .filter(Boolean);
}

export async function fetchSlackChannels(input: { token?: string; selectedChannels?: string[]; limit?: number } = {}) {
  const token = input.token ?? process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is required");

  const selected = new Set(input.selectedChannels ?? parseSlackSelectedChannels());
  const channels: SlackChannel[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      exclude_archived: "true",
      limit: String(Math.min(input.limit ?? 200, 200)),
      types: "public_channel,private_channel"
    });
    if (cursor) params.set("cursor", cursor);

    const payload = await slackFetch<SlackListResponse<{ channels: SlackConversation[] }>>(`/conversations.list?${params}`, token);
    channels.push(
      ...payload.channels.map((channel) => ({
        id: channel.id,
        name: channel.name ?? channel.id,
        isPrivate: Boolean(channel.is_private),
        isMember: Boolean(channel.is_member),
        selected: selected.has(channel.id) || selected.has(channel.name ?? "") || selected.has(`#${channel.name ?? ""}`)
      }))
    );
    cursor = payload.response_metadata?.next_cursor || undefined;
  } while (cursor && channels.length < (input.limit ?? 200));

  return channels.slice(0, input.limit ?? 200);
}

export async function fetchSlackSelectedChannelMessages(input: { token?: string; selectedChannels?: string[]; limitPerChannel?: number } = {}) {
  const token = input.token ?? process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is required");

  const selectedChannels = input.selectedChannels ?? parseSlackSelectedChannels();
  if (selectedChannels.length === 0) return [];

  const [auth, channels] = await Promise.all([
    slackFetch<{ ok: boolean; user_id?: string }>("/auth.test", token),
    fetchSlackChannels({ token, selectedChannels })
  ]);
  const mentionUserId = process.env.SLACK_USER_ID || auth.user_id;
  const selected = channels.filter((channel) => channel.selected || selectedChannels.includes(channel.id));
  const userCache = new Map<string, string>();
  const messages: SlackMessage[] = [];

  for (const channel of selected) {
    const params = new URLSearchParams({ limit: String(input.limitPerChannel ?? 10) });
    const payload = await slackFetch<SlackListResponse<{ messages: SlackHistoryMessage[] }>>(`/conversations.history?channel=${channel.id}&${params}`, token);

    for (const message of payload.messages) {
      if (!message.ts || !message.text || message.subtype === "bot_message") continue;
      const userName = message.user ? await resolveSlackUserName(token, message.user, userCache) : (message.username ?? "Slack");
      messages.push({
        id: `${channel.id}_${message.ts}`,
        channelId: channel.id,
        channelName: channel.name,
        text: message.text,
        userId: message.user,
        userName,
        ts: message.ts,
        threadTs: message.thread_ts,
        permalink: `https://slack.com/app_redirect?channel=${channel.id}&message_ts=${message.ts}`,
        mentionedCurrentUser: Boolean(mentionUserId && message.text.includes(`<@${mentionUserId}>`))
      });
    }
  }

  return messages.sort((a, b) => Number(b.ts) - Number(a.ts));
}

export function normalizeSlackMessage(message: SlackMessage): Omit<ActivityItem, "id" | "createdAt" | "updatedAt"> {
  const priority: ActivityPriority = message.mentionedCurrentUser ? "high" : "normal";
  return {
    source: "slack",
    sourceId: `slack_${message.id}`,
    type: message.mentionedCurrentUser ? "mention" : "message",
    title: `${message.mentionedCurrentUser ? "Mention" : "Message"} in #${message.channelName}`,
    body: message.text,
    actorName: message.userName,
    url: message.permalink,
    priority,
    status: "unread",
    metadata: {
      channelId: message.channelId,
      channelName: message.channelName,
      userId: message.userId,
      ts: message.ts,
      threadTs: message.threadTs,
      mentionedCurrentUser: message.mentionedCurrentUser
    }
  };
}

async function resolveSlackUserName(token: string, userId: string, cache: Map<string, string>) {
  const cached = cache.get(userId);
  if (cached) return cached;

  try {
    const payload = await slackFetch<{ ok: boolean; user?: SlackUser }>(`/users.info?user=${encodeURIComponent(userId)}`, token);
    const user = payload.user;
    const name = user?.profile?.display_name || user?.profile?.real_name || user?.real_name || user?.name || userId;
    cache.set(userId, name);
    return name;
  } catch {
    return userId;
  }
}

async function slackFetch<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`https://slack.com/api${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8"
    }
  });

  if (!response.ok) throw new Error(`Slack request failed: ${response.status}`);

  const payload = (await response.json()) as T & { ok?: boolean; error?: string };
  if (payload.ok === false) throw new Error(`Slack request failed: ${payload.error ?? "unknown_error"}`);
  return payload;
}
