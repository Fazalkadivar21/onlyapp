# CONTEXT.md

## Working context summary

We are building **mark-1**, a personal hosted unified workspace for Slack, WhatsApp, GitHub, Jira, notes, and AI.

The app's core screens are:

- Daily Brief
- Action Queue
- Unified Inbox
- Notes
- Integrations
- Settings

The core architecture normalizes important external events into `ActivityItem` records and displays them in fast cached UI.

## v0.1 target

Build all major modules thinly:

- Slack selected channels/DMs/mentions/threads with send/reply
- WhatsApp selected chats/groups with QR login, text/media send/receive, quote reply, mentions if feasible
- GitHub PR tracking
- Jira sprint tracking
- TipTap notes
- AI summaries/replies using OpenAI/Anthropic/Ollama APIs

## Current state

No app code exists yet. Project context docs are being created first.

## Assumptions to carry forward

- Use TypeScript.
- Use pnpm.
- Use Next.js.
- Use Tailwind + shadcn/Radix.
- Use Postgres + Drizzle.
- Use Redis + BullMQ.
- Use Cloudinary for media.
- Use Railway for month 1.
- Use Neon or similar external Postgres.
- Use Baileys or similar for WhatsApp.
- Use provider abstraction for AI.

## Highest priority

1. Bootstrap project.
2. Build workspace shell.
3. Add DB schema.
4. Add Slack.
5. Add WhatsApp and validate Railway viability.

## Product north star

The user should open mark-1 in the morning and immediately know:

- what happened
- what needs attention
- what messages need replies
- what PRs/tickets are moving or blocked
- what to do next
