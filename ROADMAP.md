# ROADMAP.md

## Roadmap

## Phase 0 — Foundation

Goal: create deployable base project.

Deliverables:

- Monorepo
- Next.js app
- TypeScript
- Tailwind/shadcn
- Drizzle/Postgres
- Redis/BullMQ
- Cloudinary config
- env validation
- encryption utility
- Railway deployment setup

## Phase 1 — Workspace shell

Goal: make app feel like the final workspace using mock data.

Deliverables:

- Sidebar
- Daily Brief page
- Action Queue page
- Unified Inbox page
- Notes page
- Integrations page
- Settings page
- Mock ActivityItems
- Feed/detail/composer UI
- Filters/search shell

## Phase 2 — Core persistence

Goal: implement normalized data model.

Deliverables:

- users
- integrations
- integration_secrets
- activity_items
- messages
- threads
- files
- notes
- note_links
- ai_summaries
- sync_jobs
- audit_logs

## Phase 3 — Slack

Goal: Slack is usable inside mark-1.

Deliverables:

- OAuth
- selected channels
- DMs
- mentions
- threads involving user
- send messages
- reply in threads
- ActivityItem normalization

## Phase 4 — WhatsApp

Goal: selected WhatsApp chats/groups are usable inside mark-1.

Deliverables:

- QR login
- hosted session persistence
- selected chats/groups
- text send/receive
- media send/receive via Cloudinary
- quote reply
- group mentions if reliable
- search synced chats

## Phase 5 — GitHub

Goal: PR work appears in Action Queue.

Deliverables:

- PRs created by user
- PRs needing review
- comments mentioning user
- merged PRs
- failed checks
- webhook updates
- PR summaries later

## Phase 6 — Jira

Goal: current sprint is visible without opening Jira.

Deliverables:

- current sprint
- sprint issues
- sprint progress
- status changes
- assigned tickets
- linked PRs by ticket key

## Phase 7 — Notes

Goal: Notion-lite personal notes.

Deliverables:

- TipTap editor
- pages
- slash commands
- headings/lists/checklists
- basic tables
- autosave
- link notes to ActivityItems

## Phase 8 — AI

Goal: AI explains what matters and drafts replies.

Deliverables:

- OpenAI provider
- Anthropic provider
- Ollama provider
- Daily Brief
- thread/chat/PR/sprint summaries
- suggested replies
- cached async results

## Phase 9 — Polish and speed

Goal: app feels fast and reliable.

Deliverables:

- optimistic sends
- virtualized lists
- keyboard shortcuts
- command palette
- sync health UI
- retries
- error boundaries
- indexes/performance tuning

## Month 1 target

A hosted Railway prototype where the user can:

- log in
- see the workspace shell
- connect/configure providers
- use Slack selected channels
- use WhatsApp selected chats/groups
- see basic GitHub PR data
- see basic Jira sprint data
- use basic notes
- generate at least one useful AI Daily Brief
