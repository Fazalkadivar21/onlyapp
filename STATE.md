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
- `packages/db` with Drizzle schema and migration scripts.
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
- `.env.example` with required environment variable names only.
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

1. Verify WhatsApp session survives connector restart and decide hosted session persistence/encryption strategy.
2. Wire incoming WhatsApp text messages into normalized ActivityItems.
3. Add Cloudinary upload handling to WhatsApp media receive/send path.
4. Add DB migrations generation once `DATABASE_URL` target is confirmed.

## Known blockers / missing information

- Exact DB provider not confirmed, but Neon is recommended.
- Redis provider not confirmed, likely Upstash or Railway Redis.
- Auth method not confirmed; assume simple single-user auth initially.
- Slack app credentials are not available yet.
- GitHub app/OAuth credentials are not available yet.
- Jira instance/auth details are not available yet.
- Cloudinary credentials are not available yet.
- OpenAI/Anthropic/Ollama credentials/base URLs are not available yet.
- WhatsApp connector library not yet validated on Railway.
- WhatsApp QR scan works locally; restart persistence still needs validation.

## Important warning

Do not begin by overbuilding AI or notes. The core value depends on Slack/WhatsApp messaging and unified activity. Build the shell and messaging path early.
