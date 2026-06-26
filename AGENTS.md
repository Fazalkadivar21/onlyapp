# AGENTS.md

Instructions for AI coding agents working on **mark-1**.

## Project identity

**mark-1** is a personal, hosted unified work workspace. It combines Slack, WhatsApp, GitHub, Jira, notes, and AI summaries into one fast command center.

The user wants to reduce context switching between apps and operate from a single UI with:

- Daily Brief
- Action Queue
- Unified Inbox
- Slack + WhatsApp read/write messaging
- GitHub PR awareness
- Jira sprint awareness
- Notion-lite notes
- AI summaries and reply drafts

This is currently a **personal tool**, not SaaS.

## Agent operating rules

1. Prefer practical vertical slices over perfect abstractions.
2. Keep v0.1 thin but end-to-end across all core modules.
3. Treat WhatsApp integration as high risk and validate early.
4. Optimize for fast perceived UI: cached data, optimistic updates, async jobs.
5. Never log secrets, API keys, WhatsApp sessions, or raw message bodies unnecessarily.
6. Use TypeScript throughout.
7. Keep integration logic isolated from UI logic.
8. Normalize external events into `ActivityItem` records.
9. Build for Railway month-1 deployment, but avoid Railway lock-in.
10. Assume future migration to AWS may happen.

## Expected workflow

Before coding:

1. Read `PROJECT.md`, `ARCHITECTURE.md`, `TASKS.md`, `STATE.md`, and `DECISIONS.md`.
2. Check current repository files.
3. Confirm whether the project has already been scaffolded.
4. Continue from `STATE.md` rather than restarting.

When coding:

1. Make small, coherent changes.
2. Update relevant project memory files when decisions or state change.
3. Add or update tasks in `TASKS.md`.
4. Prefer implementation that can deploy on Railway with low memory usage.
5. Keep secrets in environment variables only.
6. Use `.env.example` for required env names, never real values.

After coding:

1. Run typecheck/lint/tests when available.
2. Note any commands run and results.
3. Update `STATE.md` with current status and next steps.
4. Commit completed coherent changes before handing back, unless the user explicitly asks not to commit or validation is failing.

## Technical assumptions

These are assumptions unless contradicted by actual implementation:

- Package manager: `pnpm`
- Monorepo tooling: Turborepo or simple pnpm workspaces
- Frontend: Next.js + React + TypeScript
- Styling: Tailwind CSS + shadcn/ui/Radix
- DB: Postgres hosted externally, preferably Neon
- ORM: Drizzle
- Queue: Redis + BullMQ, likely Upstash or Railway Redis
- Media: Cloudinary
- AI: OpenAI API, Anthropic API, Ollama-compatible HTTP API
- WhatsApp: Baileys or another lightweight WhatsApp Web protocol library
- Deployment: Railway for month 1

## Coding standards

- TypeScript-first.
- Avoid `any` unless isolated and justified.
- Keep shared types in shared packages.
- Use explicit source-specific adapters for Slack, WhatsApp, GitHub, Jira.
- Do not make UI components call third-party APIs directly.
- External events should flow through backend/worker services into DB records.
- UI should read normalized records from the app backend.
- Use optimistic UI for sending Slack/WhatsApp messages.

## Security rules

This app handles company data and personal WhatsApp data.

- Encrypt integration tokens.
- Encrypt WhatsApp session credentials.
- Encrypt AI provider API keys.
- Use HTTPS in hosted environments.
- Never commit secrets.
- Avoid storing unnecessary raw content.
- Keep logs scrubbed.
- Provide data deletion paths for integrations.
- Do not send data to AI unless a provider is explicitly configured.

## Performance rules

Target perceived speed:

- UI navigation: instant/near-instant
- Search/filter synced data: under ~250ms where practical
- Sends: optimistic immediate UI update
- AI summaries: async and cached
- External API sync: background jobs

Do not block core UI on Slack/GitHub/Jira/WhatsApp/AI network calls.

## Collaboration guidelines

- If a user asks for broad scope, preserve ambition but scope implementation to shippable slices.
- Flag risky integrations clearly, especially WhatsApp.
- Do not silently downgrade critical requirements like WhatsApp send/receive.
- Explain tradeoffs briefly and proceed with the most practical implementation.
