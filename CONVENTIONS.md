# CONVENTIONS.md

## Language

- Use TypeScript throughout.
- Prefer strict types.
- Avoid `any`; if unavoidable, isolate it near external API boundaries.

## Package manager

Assumption: use `pnpm`.

## Repository organization

Recommended structure:

```txt
apps/
  web/
  worker/
  whatsapp-connector/
packages/
  db/
  integrations/
  shared/
  config/
```

## Naming conventions

- Files: kebab-case where practical, e.g. `activity-feed.tsx`.
- React components: PascalCase, e.g. `ActivityFeed`.
- Hooks: `useSomething`, e.g. `useActivityItems`.
- DB tables: snake_case, e.g. `activity_items`.
- TypeScript types/interfaces: PascalCase.
- Constants: UPPER_SNAKE_CASE for global constants.

## Architecture conventions

- Keep UI components source-agnostic where possible.
- Normalize source-specific records into shared types.
- Keep external service clients in `packages/integrations`.
- Keep database schema and migrations in `packages/db`.
- Keep shared constants/types in `packages/shared`.
- Use queues for background sync and AI jobs.
- Use optimistic UI for message sending.

## UI conventions

- Modern, simple, fast UI.
- Avoid clutter.
- Prioritize Daily Brief, Action Queue, and Unified Inbox.
- Use badges/chips for source, priority, and status.
- Use skeletons rather than blocking spinners.
- Use virtualized lists once real feeds grow.

## Data conventions

- Every important cross-source update should become an `ActivityItem`.
- Preserve source-specific details in `metadata`.
- Do not rely on raw Slack/WhatsApp/Jira/GitHub shapes in UI components.
- Store enough data for local fast search/filtering.

## Secret handling

- Never commit real secrets.
- Add env names to `.env.example`.
- Encrypt provider tokens and API keys before DB storage.
- Encrypt WhatsApp session credentials.
- Do not print secrets in logs.

## Testing strategy

Initial assumption:

- Unit test pure normalization utilities.
- Unit test provider adapters with mocked API responses.
- Integration test DB schema where practical.
- Manual smoke tests for Slack/WhatsApp auth flows.
- Add E2E tests later after UI stabilizes.

## Commit style

Preferred style:

```txt
feat: add activity feed shell
fix: sanitize integration logs
chore: configure drizzle
refactor: isolate slack adapter
```

## Error handling

- External API failures should not crash the app.
- Queue jobs should retry with backoff.
- Message sends should support pending/sent/failed states.
- Show actionable errors in integration settings.

## Performance conventions

- Do not block UI on live external API calls.
- Cache and persist synced data.
- Use DB indexes for common filters.
- Use optimistic sends.
- Generate AI summaries asynchronously.
- Cache AI summaries.

## Documentation conventions

When making meaningful changes:

- Update `TASKS.md`.
- Update `STATE.md`.
- Add ADR entries to `DECISIONS.md` for significant architecture/product decisions.
- Keep docs concise but useful to future agents.
