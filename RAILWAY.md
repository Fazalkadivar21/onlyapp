# Railway deployment notes

Deploy three Railway services from this monorepo:

## Web

- Root directory: `/`
- Build command: `pnpm install --frozen-lockfile && pnpm --filter @mark-1/web build`
- Start command: `pnpm --filter @mark-1/web start`
- Healthcheck: `/api/health`

## Worker

- Root directory: `/`
- Build command: `pnpm install --frozen-lockfile && pnpm --filter @mark-1/worker build`
- Start command: `pnpm --filter @mark-1/worker start`

## WhatsApp connector

- Root directory: `/`
- Build command: `pnpm install --frozen-lockfile && pnpm --filter @mark-1/whatsapp-connector build`
- Start command: `pnpm --filter @mark-1/whatsapp-connector start`
- Healthcheck: `/health`

Use external Postgres and Cloudinary. Do not store WhatsApp media or sessions in local ephemeral disk long-term.

Set the same `APP_URL`, `REDIS_URL`, and optional `WORKER_TOKEN` on web and worker so queued Daily Brief jobs can call back into the web app and update `sync_jobs`.
