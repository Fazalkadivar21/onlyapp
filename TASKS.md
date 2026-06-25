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
- [ ] Add feed, filters, detail panel, composer shell. (Feed and source filters exist; detail panel/composer still pending.)

## Near-term backlog

### Slack integration

- [ ] Add Slack OAuth flow.
- [ ] Store Slack tokens encrypted.
- [ ] Fetch workspace/user info.
- [ ] List Slack channels.
- [ ] Allow selected channels only.
- [ ] Sync selected channel messages.
- [ ] Sync DMs.
- [ ] Track mentions.
- [ ] Track threads involving user.
- [ ] Send channel messages.
- [ ] Send DMs.
- [ ] Reply in threads.
- [ ] Convert events to ActivityItems.

### WhatsApp integration

- [ ] Create `apps/whatsapp-connector`.
- [x] Choose/verify Baileys or equivalent.
- [x] Generate QR login.
- [ ] Persist session securely.
- [ ] Deploy connector to Railway.
- [ ] Confirm session survives restart.
- [x] List chats/groups.
- [ ] Select visible chats/groups.
- [ ] Receive text messages.
- [ ] Send text messages.
- [ ] Receive/download images/videos/files.
- [ ] Upload media to Cloudinary.
- [ ] Send images/videos/files.
- [ ] Implement quote reply if supported.
- [ ] Implement group mentions if reliable.
- [ ] Search synced WhatsApp messages.

### GitHub integration

- [ ] Add GitHub auth.
- [ ] Fetch authenticated user.
- [ ] Fetch PRs created by user.
- [ ] Fetch PRs needing review.
- [ ] Fetch comments mentioning user.
- [ ] Fetch merged PRs.
- [ ] Fetch failed checks.
- [ ] Add webhook handling.
- [ ] Store PR events as ActivityItems.

### Jira integration

- [ ] Add Jira auth.
- [ ] Select site/project/board.
- [ ] Fetch active sprint.
- [ ] Fetch sprint issues.
- [ ] Track ticket status changes.
- [ ] Track assigned tickets.
- [ ] Parse ticket keys from GitHub PRs.
- [ ] Link PRs to Jira tickets.
- [ ] Build sprint progress widget.
- [ ] Store Jira events as ActivityItems.

### Notes

- [ ] Add TipTap editor.
- [ ] Implement pages.
- [ ] Add slash command menu.
- [ ] Add headings/lists/checklists.
- [ ] Add basic tables.
- [ ] Add autosave.
- [ ] Link notes to ActivityItems.
- [ ] Add create-note-from-item action.

### AI

- [ ] Create AI provider abstraction.
- [ ] Add OpenAI provider.
- [ ] Add Anthropic provider.
- [ ] Add Ollama provider via base URL.
- [ ] Add model selection.
- [ ] Add async summary jobs.
- [ ] Cache summaries.
- [ ] Generate Daily Brief.
- [ ] Generate Slack thread summaries.
- [ ] Generate WhatsApp chat summaries.
- [ ] Generate PR summaries.
- [ ] Generate sprint summaries.
- [ ] Generate suggested reply drafts.

### Performance/polish

- [ ] Add optimistic sending.
- [ ] Add skeleton loading.
- [ ] Add virtualized lists.
- [ ] Add DB indexes.
- [ ] Add command palette.
- [ ] Add keyboard shortcuts.
- [ ] Add retry states.
- [ ] Add sync health UI.
- [ ] Add error boundaries.

## High-risk validation tasks

- [ ] Verify WhatsApp connector memory usage on Railway 0.5 GB RAM.
- [ ] Verify WhatsApp session survives Railway restarts.
- [ ] Verify media send/receive with Cloudinary.
- [ ] Verify Slack scopes/events needed for selected channels, DMs, mentions, threads.
- [ ] Verify Jira auth model for user's Jira instance.
- [ ] Verify Ollama hosted endpoint accessibility from Railway.
