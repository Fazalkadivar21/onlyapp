# DECISIONS.md

Architecture Decision Record log for mark-1.

## ADR-001 — Build a personal workspace, not SaaS

**Status:** Accepted

**Decision:** mark-1 is a personal single-user workspace first.

**Rationale:** The user's immediate pain is personal context switching across work tools. SaaS/multi-user concerns would add auth, tenancy, billing, permissions, and compliance complexity too early.

**Consequences:**

- Simpler auth and data model initially.
- No billing or team management in v0.1.
- Future SaaS conversion may require schema and permission changes.

## ADR-002 — v0.1 includes all modules thinly

**Status:** Accepted

**Decision:** v0.1 should include Slack, WhatsApp, GitHub, Jira, Notes, AI, Daily Brief, Action Queue, and Inbox in thin form.

**Rationale:** The user explicitly wants the unified workspace concept validated as a whole, not a narrow single-feature app.

**Consequences:**

- Build vertical skeletons over deep polish.
- Expect rough edges in each integration.
- Avoid full replacement behavior for every source app in v0.1.

## ADR-003 — Normalize external updates into ActivityItem

**Status:** Accepted

**Decision:** Use a generic `ActivityItem` as the core cross-source object.

**Rationale:** Slack messages, WhatsApp messages, GitHub PR updates, and Jira ticket changes need to appear in a unified feed/action queue.

**Consequences:**

- UI can be source-agnostic.
- Source-specific data lives in metadata or related tables.
- Normalization adapters become important.

## ADR-004 — WhatsApp is critical despite unofficial integration risk

**Status:** Accepted

**Decision:** Implement personal WhatsApp via WhatsApp Web-style linked-device connector.

**Rationale:** WhatsApp selected work chats/groups are critical to the user's workflow. Official WhatsApp Business API does not satisfy personal chat mirroring.

**Consequences:**

- Integration may break when WhatsApp changes internals.
- Possible account/session stability risk.
- Must validate early on Railway.
- Use best-effort reliability language.

## ADR-005 — Use hosted deployment from the start

**Status:** Accepted

**Decision:** Host month-1 version on Railway instead of local-first.

**Rationale:** User prefers hosted deployment and wants to evaluate for a month before possibly moving to AWS.

**Consequences:**

- WhatsApp session credentials live on hosted infra and must be encrypted.
- Railway memory/storage limits constrain implementation.
- Avoid local-only assumptions.

## ADR-006 — Use external Postgres and Cloudinary

**Status:** Accepted

**Decision:** Use external hosted Postgres and Cloudinary for media.

**Rationale:** Railway's low storage is not suitable for images/videos/files. External DB and media services improve portability.

**Consequences:**

- Neon Postgres is preferred.
- Cloudinary handles WhatsApp media and uploaded files.
- Railway volume storage should not be used for durable media.

## ADR-007 — Use API-based AI providers

**Status:** Accepted

**Decision:** Support OpenAI API, Anthropic API, and Ollama-compatible API.

**Rationale:** Consumer ChatGPT/Claude subscriptions do not generally provide stable application APIs. API keys/base URLs are more reliable.

**Consequences:**

- User must provide API keys/base URLs.
- Ollama is supported as remote API, not hosted on Railway.
- AI calls should be async and cached.

## ADR-008 — Ditch Excalidraw/canvas from v0.1

**Status:** Accepted

**Decision:** Do not include Excalidraw-like drawing in v0.1.

**Rationale:** User agreed to remove it. Notes, messaging, and integrations are higher value.

**Consequences:**

- Simpler scope.
- Can embed Excalidraw later if needed.

## ADR-009 — Prefer Baileys/lightweight WhatsApp connector

**Status:** Proposed/Assumed

**Decision:** Use Baileys or similar lightweight WhatsApp Web protocol library instead of Puppeteer.

**Rationale:** Railway plan has 0.5 GB RAM per service. Puppeteer/Chromium is likely too heavy.

**Consequences:**

- Must verify library supports required features: QR, sessions, text, media, quote reply, group mentions.
- Connector implementation may need more protocol-level handling.

## ADR-010 — Use optimistic sends and async summaries

**Status:** Accepted

**Decision:** Message sending should feel instant via optimistic UI; AI summaries should run asynchronously and be cached.

**Rationale:** External APIs and AI cannot guarantee 200–250ms completion, but the app can feel fast.

**Consequences:**

- Messages need pending/sent/failed state.
- Summary jobs need queue and cache tables.
- UI should not block on external calls.

## ADR-011 — Bootstrap with pnpm workspace and Turborepo

**Status:** Accepted

**Decision:** Use pnpm workspaces with Turborepo task orchestration for the initial monorepo.

**Rationale:** The project needs separate deployable apps and shared packages without heavy custom tooling.

**Consequences:**

- Web, worker, and WhatsApp connector can be built/deployed independently.
- Shared packages remain simple TypeScript packages.
- Turborepo may warn for no-output type-only package builds until package build outputs are introduced.

## ADR-012 — Encrypt WhatsApp session backup for hosted persistence

**Status:** Accepted

**Decision:** The WhatsApp connector may use Baileys multi-file auth during runtime, but it should also maintain an encrypted backup file using `ENCRYPTION_KEY` and `WHATSAPP_SESSION_BACKUP_FILE`.

**Rationale:** Railway/container filesystems can be ephemeral. The connector needs a restart survival path without committing or logging WhatsApp credentials. An encrypted backup file can live on durable storage while keeping the implementation lightweight for v0.1.

**Consequences:**

- `ENCRYPTION_KEY` is required for encrypted session backup/restore.
- The runtime session directory may still contain decrypted Baileys session files while the connector is running.
- Restart survival still needs validation on Railway with durable storage attached for the backup file.
