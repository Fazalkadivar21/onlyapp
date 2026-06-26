# STATE.md

## Current implementation state

Initial application scaffold is in place.

Implemented:

- pnpm workspace + Turborepo root config.
- `apps/web` Next.js app with TypeScript and Tailwind CSS.
- Workspace shell with sidebar navigation and top search placeholder.
- Pages: Home, Daily Brief, Action Queue, Unified Inbox, Notes, Integrations, Settings.
- Mock `ActivityItem` feed and badges.
- `packages/shared` with core domain types and mock activity data.
- `packages/db` with Drizzle schema, migration scripts, and generated initial migration under `packages/db/drizzle`.
- `packages/integrations` with adapter interfaces and normalization helper.
- `apps/worker` BullMQ skeleton for `sync`, `ai-summary`, and `daily-brief` queues.
- `apps/whatsapp-connector` Hono HTTP skeleton with `/health`, `/qr`, `/chats`, and `/send`.
- DB-backed `GET /api/activity-items` and `POST /api/activity-items` endpoints, with mock fallback when `DATABASE_URL` is not configured.
- Root `pnpm db:seed` command that seeds mock ActivityItems into Postgres.
- Home, Daily Brief, Action Queue, and Inbox now fetch activity via `/api/activity-items`.
- AES-256-GCM integration secret encryption utility in `packages/integrations`.
- WhatsApp connector Baileys spike with QR login endpoint, chat cache, and text send endpoint.
- WhatsApp local QR scan reached connected state (`/health` reported `status: connected` and 6 chats).
- Cloudinary media config/upload/delete wrapper in `packages/integrations`.
- Interactive source filters on Unified Inbox.
- Incoming WhatsApp text/caption messages are normalized and forwarded to web `POST /api/activity-items` when `APP_URL` is set.
- WhatsApp connector only forwards selected chats/groups, configured by `WHATSAPP_SELECTED_CHATS` or `POST /selected-chats`.
- Web activity item POST supports optional bearer auth via `WHATSAPP_CONNECTOR_TOKEN` and dedupes by source/sourceId.
- Web Integrations page includes a WhatsApp control panel backed by `/api/integrations/whatsapp` for connector status, QR rendering, chat listing, and selected chat/group saving.
- WhatsApp connector endpoints are bearer-token protected when `WHATSAPP_CONNECTOR_TOKEN` is set, with `/health` left public for health checks.
- Unified Inbox includes a WhatsApp composer that loads selected chats, sends through `/api/messages/whatsapp`, and shows optimistic pending/sent/failed states.
- WhatsApp send API persists outgoing message status to `messages` when `DATABASE_URL` is configured and still works as connector-only send without DB.
- Unified Inbox has an ActivityItem detail panel. Selecting an item shows source/status/body metadata; WhatsApp items expose a reply action that prefills the composer with the source chat ID.
- ActivityItem detail panel supports seen/done/snoozed status actions. Updates are optimistic in the UI and persist through `PATCH /api/activity-items` when `DATABASE_URL` is configured.
- Notes page now has a lightweight notes workspace with list/create/select/edit and debounced autosave via `/api/notes`. It uses a mock local note fallback without `DATABASE_URL`. Inbox ActivityItem detail can create a prefilled linked note; DB mode persists the relationship in `note_links`.
- AI provider abstraction exists in `packages/integrations` for OpenAI, Anthropic, and Ollama-compatible `/api/chat` endpoints.
- Daily Brief page uses `/api/daily-brief`; it reads cached ActivityItems, generates/caches DB summaries in `ai_summaries`, and falls back to a heuristic brief when no AI provider is configured or AI fails.
- GitHub integration skeleton exists: `packages/integrations/src/github.ts` fetches PR activity using `GITHUB_TOKEN` and optional `GITHUB_REPOSITORIES`: PRs created by user, PRs needing review, PRs/comments mentioning user, merged PRs, and open PRs with failing checks. `/api/integrations/github/prs` lists these and can sync them into distinct normalized ActivityItems; Integrations page has a GitHub PR panel.
- Jira integration skeleton exists: `packages/integrations/src/jira.ts` fetches active sprint issues with `JIRA_BOARD_ID` or assigned project issues with `JIRA_PROJECT_KEY`; `/api/integrations/jira/issues` lists issues, returns calculated sprint progress, and can sync issues into normalized ActivityItems; Integrations page has a Jira panel with done/in-progress/todo/blocked/unassigned counts, completion bar, and status breakdown.
- Slack integration skeleton exists: `packages/integrations/src/slack.ts` lists channels and DMs via `SLACK_BOT_TOKEN` or an encrypted OAuth bot token from DB, reads `SLACK_SELECTED_CHANNELS`/`SLACK_SELECTED_DMS` plus DB-persisted channel/DM selections from integration metadata, fetches recent selected-channel/DM messages plus thread replies, detects mentions of the authenticated bot/user, normalizes messages into ActivityItems, and can send channel/DM/thread messages; Integrations page has a Slack panel with a simple composer, optional thread timestamp, OAuth connect link, and selected channel/DM toggles.
- Slack OAuth routes exist under `/api/integrations/slack/oauth/start` and `/callback`; callback exchanges the code, creates a default single-user record when needed, stores integration metadata, and inserts encrypted Slack token payload into `integration_secrets`.
- Workspace shell includes a client command palette opened with ⌘K/Ctrl+K for quick page navigation.
- Activity feeds and integration panels now show skeleton loading cards plus retryable error notices for failed fetches.
- Unified Inbox search now queries `/api/activity-items` by title/body/actor/type and supports source/status/priority query filters with mock fallback.
- Activity feeds now request paginated ActivityItems with `limit`/`offset`, expose Load More, and send action-queue filtering to the API instead of only filtering the first page client-side.
- Integrations page now includes a Sync Health panel backed by `/api/sync-health`; it checks key env configuration, WhatsApp connector `/health`, recent failed outbound messages, and recent `sync_jobs` without exposing message bodies or secrets.
- DB schema now has practical indexes for inbox reads, source/sourceId dedupe, message health queries, notes ordering, note links, AI summary cache lookups, and sync job health queries.
- WhatsApp connector handles incoming media from selected chats: image/video/document/audio messages are downloaded through Baileys, uploaded to Cloudinary when Cloudinary env vars are configured, and forwarded as ActivityItems with media metadata. If Cloudinary is not configured, media ActivityItems are still forwarded with an upload-skipped marker.
- WhatsApp media sending exists: web `/api/messages/whatsapp`, the inbox composer, and connector `/send` accept media URLs for image/video/document/audio sends with optional caption/file name.
- WhatsApp composer now supports local file upload: `/api/media/upload` accepts multipart files up to 25MB, uploads them to Cloudinary, infers media type, and fills the media send fields.
- WhatsApp session persistence now has an encrypted backup path: connector restores `WHATSAPP_SESSION_BACKUP_FILE` into `WHATSAPP_SESSION_DIR` before Baileys starts, and backs up session files after credential updates when `ENCRYPTION_KEY` is configured.
- WhatsApp integration panel displays session directory, encrypted backup configuration, backup file path, last backup time, and backup errors from connector health state.
- `.env.example` with required environment variable names only, including `SLACK_SELECTED_DMS`, Slack OAuth redirect env, and default single-user envs.
- `RAILWAY.md` deployment notes for web, worker, and WhatsApp connector services.

## Current directory

```txt
/home/fazalkadivar21/personal/mark-1
```

## Existing app structure

```txt
apps/web
apps/worker
apps/whatsapp-connector
packages/shared
packages/db
packages/integrations
```

## Validation run

- `pnpm install` — passed.
- `pnpm typecheck` — passed.
- `pnpm build` — passed.
- `pnpm lint` — passed. Current lint script is TypeScript validation.
- Re-ran all above after adding activity item API — passed.
- Re-ran after seed command + API-backed UI — passed.
- `pnpm check:secrets` — passed.
- Re-ran install/typecheck/build/lint after encryption utility — passed.
- Re-ran typecheck/build/lint after Baileys connector spike — passed.
- `timeout 3 node apps/whatsapp-connector/dist/index.js` — server starts successfully.
- User manually confirmed WhatsApp `/health` returns connected.
- Re-ran typecheck/build/lint after Cloudinary wrapper + inbox filters — passed.
- Re-ran typecheck/build/lint after WhatsApp incoming ActivityItem forwarding — passed.
- Re-ran typecheck/build/lint after WhatsApp selected-chat filtering — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after WhatsApp web integration panel — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after WhatsApp web composer/send API — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after ActivityItem detail panel + WhatsApp reply prefill — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after ActivityItem status actions — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after Notes CRUD/autosave — passed.
- First `pnpm typecheck` after Daily Brief AI failed because web did not depend on `@mark-1/integrations`; added dependency/path alias.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after Daily Brief AI endpoint/UI — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after GitHub PR skeleton — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after Jira issues skeleton — passed.
- Re-ran `pnpm typecheck`, `pnpm lint`, and `pnpm build` after Slack selected-channel skeleton — passed.
- Re-ran `pnpm install`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` after WhatsApp incoming media download/upload support — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after WhatsApp media URL send support — passed. First parallel lint/build run had a transient `.next/types` race; rerunning lint after build passed.
- Re-ran `pnpm --filter @mark-1/whatsapp-connector typecheck`, `pnpm typecheck`, `pnpm build`, and `pnpm lint` after encrypted WhatsApp session backup support — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after adding WhatsApp session backup status UI — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after adding web media upload for WhatsApp sends — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after Slack channel send API/composer — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after command palette — passed.
- Re-ran `pnpm typecheck`, `pnpm lint`, and `pnpm build` after skeleton/retry states — passed.
- Re-ran `pnpm typecheck`, `pnpm lint`, and `pnpm build` after Sync Health panel/API — passed.
- Ran `pnpm db:generate` after adding DB indexes — passed and generated `packages/db/drizzle/0000_odd_king_bedlam.sql`.
- Re-ran `pnpm typecheck`, `pnpm lint`, and `pnpm build` after DB indexes/migration — passed.
- Re-ran `pnpm typecheck`, `pnpm lint`, and `pnpm build` after Slack DM/thread support — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after Slack OAuth encrypted token storage — passed. Initial parallel `pnpm lint` + `pnpm build` hit the known `.next/types` race; rerunning lint after build passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after Slack DB-backed selected channel/DM toggles — passed. Initial parallel `pnpm lint` + `pnpm build` hit the known `.next/types` race; rerunning lint after build passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after expanding GitHub PR activity sync — passed. Initial parallel `pnpm lint` + `pnpm build` hit the known `.next/types` race; rerunning lint after build passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after adding Jira sprint progress widget — passed. Initial parallel `pnpm lint` + `pnpm build` hit the known `.next/types` race; rerunning lint after build passed.
- Ran `pnpm db:generate` after adding `note_links` — passed and generated `packages/db/drizzle/0001_fancy_leopardon.sql`.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after ActivityItem linked-note creation — passed. Initial parallel `pnpm lint` + `pnpm build` hit the known `.next/types` race; rerunning lint after build passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after adding Inbox ActivityItem search — passed.
- Re-ran `pnpm typecheck`, `pnpm build`, and `pnpm lint` after adding ActivityItem feed pagination — passed.

Notes:

- Next.js added `allowJs` and `isolatedModules` to `apps/web/tsconfig.json` during build.
- Turborepo warns that type-only package builds have no output files; acceptable for current scaffold.

## User decisions already made

- Personal app, not SaaS.
- v0.1 should include all modules thinly.
- WhatsApp is critical.
- Unofficial WhatsApp Web-style integration risk is accepted.
- Hosted deployment is preferred over local-first.
- Railway will be used for month 1.
- External DB is acceptable/preferred.
- Cloudinary will handle media files, mostly images/videos.
- AI providers: OpenAI, Anthropic, Ollama APIs.
- Excalidraw/canvas is removed from scope.
- Slack should use selected channels only.
- WhatsApp should support selected chats/groups.

## Next agent should do

1. Validate WhatsApp session survives connector restart locally and then on Railway with `WHATSAPP_SESSION_BACKUP_FILE` on durable storage.
2. Smoke-test Slack OAuth and DB-backed selected channel/DM toggles against a real Slack app.
3. Smoke-test GitHub PR activity search qualifiers with a real token/repo set.
4. Smoke-test Jira sprint progress/status grouping with a real Jira board.
5. Apply DB migrations once `DATABASE_URL` target is confirmed, including `note_links`.
6. Continue high-risk real-service smoke tests: WhatsApp Railway restart, Slack OAuth, GitHub search qualifiers, and Jira board grouping.

## Known blockers / missing information

- Exact DB provider not confirmed, but Neon is recommended.
- Redis provider not confirmed, likely Upstash or Railway Redis.
- Auth method not confirmed; assume simple single-user auth initially.
- Slack app credentials are not available yet; current Slack skeleton can use a manually provided `SLACK_BOT_TOKEN` or encrypted OAuth token plus env-selected `SLACK_SELECTED_CHANNELS`/`SLACK_SELECTED_DMS`.
- GitHub app/OAuth credentials are not available yet.
- Jira instance/auth details are not available yet.
- Cloudinary credentials are not available yet.
- OpenAI/Anthropic/Ollama credentials/base URLs are not available yet.
- WhatsApp connector library not yet validated on Railway.
- WhatsApp QR scan works locally; restart persistence still needs validation.

## Important warning

Do not begin by overbuilding AI or notes. The core value depends on Slack/WhatsApp messaging and unified activity. Build the shell and messaging path early.
