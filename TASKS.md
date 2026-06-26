# TASKS.md

## Current status

Repository now has an initial pnpm/Turborepo monorepo scaffold with web, worker, WhatsApp connector, db, integrations, and shared packages.

## Completed

- Product scope discussed and locked at high level.
- v0.1 strategy chosen: all major modules thinly.
- Hosting direction chosen: Railway for month 1.
- External DB/media/AI choices clarified.
- WhatsApp risk accepted.
- Excalidraw removed from scope.
- AI providers selected: OpenAI, Anthropic, Ollama.
- Project memory files created.
- Initial monorepo scaffold created.
- DB-backed activity item API added with mock fallback.
- Dev seed command added for mock ActivityItems.
- Home, Daily Brief, Action Queue, and Inbox now load activity through `/api/activity-items`.
- Integration secret encryption utility added and validated.
- WhatsApp connector Baileys QR/session spike started with `/connect`, `/qr`, `/chats`, `/send`, and local multi-file auth session directory.
- WhatsApp local QR scan connected successfully.
- Cloudinary media wrapper added.
- Unified Inbox source filters are interactive.
- Incoming WhatsApp text/caption messages forward into `/api/activity-items` as normalized ActivityItems.
- WhatsApp incoming forwarding is limited to selected chats/groups via `WHATSAPP_SELECTED_CHATS` or `/selected-chats`.
- Integrations page has a WhatsApp panel for connector status, QR scan, and selected chat/group management.
- Unified Inbox has a WhatsApp composer that sends text to selected chats/groups with optimistic pending/sent/failed UI.
- Unified Inbox has an ActivityItem detail panel with WhatsApp reply prefill from item metadata.
- ActivityItems can be marked seen/done/snoozed from the detail panel and persist via `PATCH /api/activity-items` when DB is configured.
- Notes page now has basic CRUD/autosave against `/api/notes` with mock fallback when DB is not configured.
- Daily Brief has an AI provider abstraction for OpenAI/Anthropic/Ollama plus `/api/daily-brief` with cached DB summaries and heuristic fallback.
- GitHub integration has a token-based PR list skeleton and can sync open PRs into normalized ActivityItems.
- Jira integration has a basic active sprint/assigned issues skeleton and can sync issues into normalized ActivityItems.
- Slack integration has a bot-token selected-channel skeleton and can sync recent selected-channel messages/mentions into normalized ActivityItems.
- WhatsApp connector downloads incoming image/video/document/audio messages from selected chats and uploads them to Cloudinary when configured, attaching media metadata to ActivityItems.
- WhatsApp composer/API/connector can send image/video/document/audio messages by media URL, with optimistic UI status.
- WhatsApp composer can upload local files to Cloudinary through `/api/media/upload` before sending media.
- WhatsApp connector can create/restore an encrypted Baileys session backup using `ENCRYPTION_KEY` and `WHATSAPP_SESSION_BACKUP_FILE`.
- Slack can send channel messages through `SLACK_BOT_TOKEN`, with a simple Integrations-page composer and DB outgoing message status when configured.
- Workspace shell has a basic command palette via ⌘K/Ctrl+K for page navigation.
- Integrations page has a Sync Health panel backed by `/api/sync-health` for env/config checks, WhatsApp connector health, failed sends, and recent sync jobs.
- Initial Drizzle migration file generated, including DB indexes for ActivityItems, messages, notes, AI summaries, and sync jobs.
- Slack integration now lists/sends to DMs, syncs selected DMs via `SLACK_SELECTED_DMS`, syncs thread replies, and exposes thread reply sending with an optional thread timestamp.
- Slack OAuth connect flow added; bot tokens can now be stored encrypted in DB and used by Slack list/sync/send routes when `SLACK_BOT_TOKEN` is not set.
- Slack selected channels/DMs can now be toggled in the Integrations UI and persisted in integration metadata, while env selections remain supported.
- GitHub PR panel/sync now includes created PRs, review requests, mentions, merged PRs, and failing-check PRs as distinct ActivityItems.
- Jira integration panel now shows a sprint progress widget with done/in-progress/todo/blocked/unassigned counts and status breakdown.
- Notes can now be created from ActivityItems via the inbox detail panel, with `note_links` persisted in DB.
- Unified Inbox now has text search backed by `/api/activity-items?q=...`, including synced WhatsApp ActivityItems.
- Activity feeds now load ActivityItems in pages with a Load More button and server-side action queue filtering.
- GitHub PR sync now extracts Jira issue keys from PR titles, stores them in ActivityItem metadata, and shows Jira key badges in the GitHub panel.
- Next.js route/global error boundaries added with retry/home recovery UI and scrubbed error display.

## Immediate priority

### P0 — Bootstrap repository

- [x] Create monorepo structure.
- [x] Configure `pnpm` workspace.
- [x] Add Next.js app under `apps/web`.
- [x] Add TypeScript config.
- [x] Add Tailwind CSS.
- [ ] Add shadcn/ui or Radix setup.
- [x] Add base lint/format scripts.
- [x] Add `.env.example`.
- [x] Add Railway deployment config.

### P0 — Data and infrastructure foundation

- [x] Create `packages/db`.
- [x] Add Drizzle ORM.
- [ ] Connect to external Postgres.
- [x] Add initial schema.
- [x] Add migration scripts.
- [x] Generate initial migration file.
- [x] Add Redis/BullMQ queue package/config.
- [x] Add Cloudinary SDK/config.
- [x] Add encryption utility for secrets.

### P0 — Workspace shell

- [x] Create app layout.
- [x] Add sidebar navigation.
- [x] Add Daily Brief page.
- [x] Add Action Queue page.
- [x] Add Unified Inbox page.
- [x] Add Notes page.
- [x] Add Integrations page.
- [x] Add Settings page.
- [x] Add mock ActivityItems.
- [x] Add feed, filters, detail panel, composer shell.
- [x] Add ActivityItem status actions.

## Near-term backlog

### Slack integration

- [x] Add Slack OAuth flow.
- [x] Store Slack tokens encrypted.
- [x] Fetch workspace/user info.
- [x] List Slack channels.
- [x] Allow selected channels only.
- [x] Persist selected Slack channels/DMs from UI.
- [x] Sync selected channel messages.
- [x] Sync DMs.
- [x] Track mentions.
- [x] Track threads involving user.
- [x] Send channel messages.
- [x] Send DMs.
- [x] Reply in threads.
- [x] Convert events to ActivityItems.

### WhatsApp integration

- [x] Create `apps/whatsapp-connector`.
- [x] Choose/verify Baileys or equivalent.
- [x] Generate QR login.
- [x] Persist session securely.
- [ ] Deploy connector to Railway.
- [ ] Confirm session survives restart.
- [x] List chats/groups.
- [x] Select visible chats/groups.
- [x] Add web UI for QR login and selected chats/groups.
- [x] Receive text messages.
- [x] Send text messages.
- [x] Add web composer for WhatsApp text sends.
- [x] Receive/download images/videos/files.
- [x] Upload media to Cloudinary.
- [x] Send images/videos/files.
- [ ] Implement quote reply if supported.
- [ ] Implement group mentions if reliable.
- [x] Search synced WhatsApp messages.

### GitHub integration

- [ ] Add GitHub auth.
- [ ] Fetch authenticated user.
- [x] Fetch PRs created by user.
- [x] Fetch PRs needing review.
- [x] Fetch comments mentioning user.
- [x] Fetch merged PRs.
- [x] Fetch failed checks.
- [ ] Add webhook handling.
- [x] Store PR events as ActivityItems.

### Jira integration

- [ ] Add Jira auth.
- [ ] Select site/project/board.
- [x] Fetch active sprint.
- [x] Fetch sprint issues.
- [ ] Track ticket status changes.
- [x] Track assigned tickets.
- [x] Parse ticket keys from GitHub PRs.
- [x] Link PRs to Jira tickets.
- [x] Build sprint progress widget.
- [x] Store Jira events as ActivityItems.

### Notes

- [ ] Add TipTap editor.
- [x] Implement pages.
- [ ] Add slash command menu.
- [ ] Add headings/lists/checklists.
- [ ] Add basic tables.
- [x] Add autosave.
- [x] Link notes to ActivityItems.
- [x] Add create-note-from-item action.

### AI

- [x] Create AI provider abstraction.
- [x] Add OpenAI provider.
- [x] Add Anthropic provider.
- [x] Add Ollama provider via base URL.
- [ ] Add model selection.
- [ ] Add async summary jobs.
- [x] Cache summaries.
- [x] Generate Daily Brief.
- [ ] Generate Slack thread summaries.
- [ ] Generate WhatsApp chat summaries.
- [ ] Generate PR summaries.
- [ ] Generate sprint summaries.
- [ ] Generate suggested reply drafts.

### Performance/polish

- [x] Add optimistic sending for WhatsApp text composer.
- [x] Add skeleton loading.
- [x] Add feed pagination.
- [x] Add DB indexes.
- [x] Add command palette.
- [x] Add keyboard shortcuts.
- [x] Add retry states.
- [x] Add sync health UI.
- [x] Add error boundaries.

## High-risk validation tasks

- [ ] Verify WhatsApp connector memory usage on Railway 0.5 GB RAM.
- [ ] Verify WhatsApp session survives Railway restarts.
- [ ] Verify media send/receive with Cloudinary.
- [ ] Verify Slack scopes/events needed for selected channels, DMs, mentions, threads.
- [ ] Verify Jira auth model for user's Jira instance.
- [ ] Verify Ollama hosted endpoint accessibility from Railway.
