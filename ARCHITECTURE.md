# ARCHITECTURE.md

## System overview

mark-1 is a hosted personal workspace composed of a web app, background worker, WhatsApp connector, database, queue, media storage, and external integrations.

```txt
Browser
  ↓
Next.js Web App on Railway
  ↓
Postgres Database
  ↓
Redis Queue / BullMQ
  ↓
Worker Service on Railway
  ↓
Slack / GitHub / Jira / AI APIs

WhatsApp Connector on Railway
  ↓
WhatsApp linked-device session
  ↓
Cloudinary for media
```

## Services

### `apps/web`

Responsibilities:

- Next.js UI
- App routing
- API endpoints/server actions
- Auth/session handling
- Integration settings UI
- Daily Brief UI
- Action Queue UI
- Inbox UI
- Notes UI
- Composer UI

The web app should not contain complex third-party sync loops. Long-running sync belongs in workers/connectors.

### `apps/worker`

Responsibilities:

- Background sync jobs
- AI summary jobs
- GitHub/Jira polling if needed
- Retry/failure handling
- Scheduled Daily Brief generation
- Webhook post-processing

### `apps/whatsapp-connector`

Responsibilities:

- WhatsApp QR login
- Hosted linked-device session
- Session persistence
- Incoming message stream
- Outgoing message send
- Media download/upload coordination
- Chat/group listing
- Selected chat sync

Use a lightweight WhatsApp Web protocol library such as Baileys. Avoid Puppeteer/Chromium unless absolutely necessary.

### `packages/db`

Responsibilities:

- Drizzle schema
- DB client
- migrations
- shared persistence helpers

### `packages/integrations`

Responsibilities:

- Slack client
- GitHub client
- Jira client
- AI provider clients
- Source-specific normalization helpers

### `packages/shared`

Responsibilities:

- Shared types
- Constants
- Utility functions
- ActivityItem definitions

## Core data flow

### Incoming external event

```txt
Slack/GitHub/Jira webhook or sync job
  ↓
Integration adapter
  ↓
Normalize to ActivityItem/message/thread/etc.
  ↓
Persist in Postgres
  ↓
Notify UI via refetch/realtime later
```

### WhatsApp incoming message

```txt
WhatsApp network
  ↓
WhatsApp connector
  ↓
Normalize message
  ↓
Upload media to Cloudinary if present
  ↓
Persist message + ActivityItem
  ↓
UI displays item
```

### Sending message

```txt
User composes message
  ↓
UI creates optimistic pending message
  ↓
Backend queues/sends through Slack or WhatsApp adapter
  ↓
External platform confirms/fails
  ↓
DB updates message status
  ↓
UI reflects sent/failed state
```

### AI summary

```txt
User requests summary or scheduled brief runs
  ↓
Summary job created
  ↓
Worker fetches relevant cached DB context
  ↓
Provider adapter calls OpenAI/Anthropic/Ollama
  ↓
Summary saved in ai_summaries
  ↓
UI displays cached summary
```

## Core entity: ActivityItem

All important cross-source updates are normalized into `ActivityItem`.

```ts
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
  metadata: unknown;
};
```

## Expected tables

- `users`
- `integrations`
- `integration_secrets`
- `activity_items`
- `messages`
- `threads`
- `files`
- `notes`
- `note_links`
- `ai_summaries`
- `sync_jobs`
- `audit_logs`
- `selected_slack_channels`
- `selected_whatsapp_chats`
- `github_prs`
- `jira_issues`
- `jira_sprints`

## Integration boundaries

### Slack

- Official API/OAuth/events.
- Selected channels only.
- DMs, mentions, and threads involving user.
- Send channel messages, DMs, and thread replies.

### WhatsApp

- Unofficial WhatsApp Web-style linked device.
- Hosted connector.
- QR login.
- Selected chats/groups only.
- Text and media send/receive.
- Quote reply and group mentions if supported reliably.

### GitHub

- OAuth or GitHub App.
- PRs created by user.
- PRs needing review.
- Comments mentioning user.
- Merged PRs.
- Failed checks.

### Jira

- Jira REST API.
- Current sprint.
- Sprint issues/progress.
- Ticket status changes.
- Assigned tickets.
- Linked PRs by ticket key.

### AI

- Provider abstraction.
- OpenAI.
- Anthropic.
- Ollama-compatible API.
- Async summaries and cached results.

## Realtime strategy

Assumption for v0.1:

- Start with polling/refetch and background sync.
- Add SSE/WebSockets later if needed.
- UI must stay responsive from cached data.

## Security architecture

- Store tokens/session credentials encrypted.
- Use env-provided encryption key.
- Keep logs sanitized.
- Avoid raw message body logging.
- Use least-privilege OAuth scopes.
- Store media in Cloudinary, not local disk.
- Add delete integration data controls.

## Deployment architecture

Initial deployment:

- Railway service: web
- Railway service: worker
- Railway service: whatsapp-connector
- External Postgres: Neon preferred
- Redis: Upstash or Railway Redis
- Media: Cloudinary

Potential migration:

- Move WhatsApp connector to VPS/AWS if Railway memory/session stability is poor.
- Move full system to AWS later if needed.
