import type { ActivityItem, ActivityPriority } from "@mark-1/shared";

export type SlackChannel = {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  selected: boolean;
  kind?: "channel" | "dm";
};

export type SlackSendResult = {
  channelId: string;
  ts: string;
  permalink?: string;
};

export type SlackMessage = {
  id: string;
  channelId: string;
  channelName: string;
  isDm?: boolean;
  text: string;
  userId?: string;
  userName: string;
  ts: string;
  threadTs?: string;
  isThreadReply?: boolean;
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
  is_im?: boolean;
  user?: string;
};

type SlackHistoryMessage = {
  type?: string;
  subtype?: string;
  user?: string;
  username?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
  reply_count?: number;
};

type SlackUser = {
  id: string;
  name?: string;
  real_name?: string;
  profile?: { display_name?: string; real_name?: string };
};

export function parseSlackSelectedChannels(value = process.env.SLACK_SELECTED_CHANNELS) {
  return parseCsv(value);
}

export function parseSlackSelectedDms(value = process.env.SLACK_SELECTED_DMS) {
  return parseCsv(value);
}

function parseCsv(value?: string) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
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
        selected: selected.has(channel.id) || selected.has(channel.name ?? "") || selected.has(`#${channel.name ?? ""}`),
        kind: "channel" as const
      }))
    );
    cursor = payload.response_metadata?.next_cursor || undefined;
  } while (cursor && channels.length < (input.limit ?? 200));

  return channels.slice(0, input.limit ?? 200);
}

export async function fetchSlackDms(input: { token?: string; selectedDms?: string[]; limit?: number } = {}) {
  const token = input.token ?? process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is required");

  const selectedDms = new Set(input.selectedDms ?? parseSlackSelectedDms());
  const userCache = new Map<string, string>();
  const dms: SlackChannel[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ exclude_archived: "true", limit: String(Math.min(input.limit ?? 100, 200)), types: "im" });
    if (cursor) params.set("cursor", cursor);

    const payload = await slackFetch<SlackListResponse<{ channels: SlackConversation[] }>>(`/conversations.list?${params}`, token);
    for (const dm of payload.channels) {
      const name = dm.user ? await resolveSlackUserName(token, dm.user, userCache) : dm.id;
      dms.push({
        id: dm.id,
        name,
        isPrivate: true,
        isMember: true,
        selected: selectedDms.has(dm.id) || selectedDms.has(dm.user ?? "") || selectedDms.has(name),
        kind: "dm" as const
      });
    }
    cursor = payload.response_metadata?.next_cursor || undefined;
  } while (cursor && dms.length < (input.limit ?? 100));

  return dms.slice(0, input.limit ?? 100);
}

export async function fetchSlackSelectedChannelMessages(input: { token?: string; selectedChannels?: string[]; selectedDms?: string[]; limitPerChannel?: number } = {}) {
  const token = input.token ?? process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is required");

  const selectedChannels = input.selectedChannels ?? parseSlackSelectedChannels();
  const selectedDms = input.selectedDms ?? parseSlackSelectedDms();
  if (selectedChannels.length === 0 && selectedDms.length === 0) return [];

  const [auth, channels] = await Promise.all([
    slackFetch<{ ok: boolean; user_id?: string }>("/auth.test", token),
    fetchSlackChannels({ token, selectedChannels })
  ]);
  const mentionUserId = process.env.SLACK_USER_ID || auth.user_id;
  const dms = selectedDms.length > 0 ? await fetchSlackDms({ token, selectedDms }) : [];
  const selected = [
    ...channels.filter((channel) => channel.selected || selectedChannels.includes(channel.id)),
    ...dms.filter((dm) => dm.selected || selectedDms.includes(dm.id))
  ];
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
        isDm: channel.kind === "dm",
        text: message.text,
        userId: message.user,
        userName,
        ts: message.ts,
        threadTs: message.thread_ts,
        isThreadReply: Boolean(message.thread_ts && message.thread_ts !== message.ts),
        permalink: `https://slack.com/app_redirect?channel=${channel.id}&message_ts=${message.ts}`,
        mentionedCurrentUser: Boolean(mentionUserId && message.text.includes(`<@${mentionUserId}>`)) || channel.kind === "dm"
      });

      if (message.reply_count && message.reply_count > 0) {
        const replies = await fetchSlackThreadReplies({ token, channelId: channel.id, channelName: channel.name, threadTs: message.ts, mentionUserId, userCache, isDm: channel.kind === "dm" });
        messages.push(...replies);
      }
    }
  }

  return messages.sort((a, b) => Number(b.ts) - Number(a.ts));
}

async function fetchSlackThreadReplies(input: { token: string; channelId: string; channelName: string; threadTs: string; mentionUserId?: string; userCache: Map<string, string>; isDm?: boolean }) {
  const params = new URLSearchParams({ channel: input.channelId, ts: input.threadTs, limit: "20" });
  const payload = await slackFetch<SlackListResponse<{ messages: SlackHistoryMessage[] }>>(`/conversations.replies?${params}`, input.token);
  const replies = payload.messages.slice(1);
  const result: SlackMessage[] = [];

  for (const reply of replies) {
    if (!reply.ts || !reply.text || reply.subtype === "bot_message") continue;
    const userName = reply.user ? await resolveSlackUserName(input.token, reply.user, input.userCache) : (reply.username ?? "Slack");
    result.push({
      id: `${input.channelId}_${reply.ts}`,
      channelId: input.channelId,
      channelName: input.channelName,
      isDm: input.isDm,
      text: reply.text,
      userId: reply.user,
      userName,
      ts: reply.ts,
      threadTs: input.threadTs,
      isThreadReply: true,
      permalink: `https://slack.com/app_redirect?channel=${input.channelId}&message_ts=${reply.ts}`,
      mentionedCurrentUser: Boolean(input.mentionUserId && reply.text.includes(`<@${input.mentionUserId}>`)) || Boolean(input.isDm)
    });
  }

  return result;
}

export async function sendSlackMessage(input: { token?: string; channelId: string; text: string; threadTs?: string }): Promise<SlackSendResult> {
  const token = input.token ?? process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is required");
  if (!input.channelId || !input.text.trim()) throw new Error("channelId and text are required");

  const payload = await slackFetch<{ ok: boolean; channel: string; ts: string }>("/chat.postMessage", token, {
    method: "POST",
    body: JSON.stringify({ channel: input.channelId, text: input.text, thread_ts: input.threadTs })
  });

  return {
    channelId: payload.channel,
    ts: payload.ts,
    permalink: `https://slack.com/app_redirect?channel=${payload.channel}&message_ts=${payload.ts}`
  };
}

export function normalizeSlackMessage(message: SlackMessage): Omit<ActivityItem, "id" | "createdAt" | "updatedAt"> {
  const priority: ActivityPriority = message.mentionedCurrentUser ? "high" : "normal";
  const location = message.isDm ? message.channelName : `#${message.channelName}`;
  return {
    source: "slack",
    sourceId: `slack_${message.id}`,
    type: message.isThreadReply ? "thread_reply" : message.isDm ? "dm" : message.mentionedCurrentUser ? "mention" : "message",
    title: `${message.isThreadReply ? "Thread reply" : message.isDm ? "DM" : message.mentionedCurrentUser ? "Mention" : "Message"} in ${location}`,
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
      isThreadReply: message.isThreadReply,
      isDm: message.isDm,
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

async function slackFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://slack.com/api${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
      ...init.headers
    }
  });

  if (!response.ok) throw new Error(`Slack request failed: ${response.status}`);

  const payload = (await response.json()) as T & { ok?: boolean; error?: string };
  if (payload.ok === false) throw new Error(`Slack request failed: ${payload.error ?? "unknown_error"}`);
  return payload;
}
