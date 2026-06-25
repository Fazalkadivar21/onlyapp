# RISKS.md

## Major risks

## 1. WhatsApp reliability

Personal WhatsApp integration requires unofficial WhatsApp Web-style linked-device behavior.

Risks:

- Library breaks when WhatsApp changes protocol.
- Account/session instability.
- Railway restarts may disrupt session.
- Required features may be partially supported.

Mitigation:

- Validate early.
- Use lightweight Baileys-style library.
- Encrypt and persist session data.
- Test restart survival.
- Be ready to move connector to VPS/AWS.

## 2. Railway resource limits

Current plan provides about 0.5 GB RAM per service.

Risks:

- WhatsApp connector memory pressure.
- Next.js memory pressure.
- Worker jobs competing for memory.
- Puppeteer/Chromium impossible or unstable.

Mitigation:

- Avoid browser automation.
- Keep services separate.
- Use Cloudinary for media.
- Use external DB/Redis where possible.
- Monitor memory.

## 3. Security of hosted personal data

The app stores company messages, WhatsApp data, API keys, and integration tokens.

Risks:

- Secret leakage.
- Sensitive message logs.
- AI provider data exposure.
- WhatsApp session compromise.

Mitigation:

- Encrypt secrets.
- Sanitize logs.
- Use HTTPS.
- Minimize stored content where practical.
- Add delete integration data controls.

## 4. Scope creep

The product touches Slack, WhatsApp, GitHub, Jira, Notion-like notes, and AI.

Risks:

- Building shallow unfinished modules.
- Losing focus before core messaging works.
- Overbuilding notes/AI before integration value exists.

Mitigation:

- Build thin vertical slices.
- Prioritize shell, Slack, WhatsApp.
- Keep v0.1 expectations clear.

## 5. External API limitations

Slack, GitHub, Jira, Cloudinary, OpenAI, Anthropic, and Ollama all have their own auth, rate limits, and quirks.

Risks:

- Missing OAuth scopes.
- Rate limits.
- Webhook setup friction.
- Jira instance-specific differences.
- Ollama endpoint unavailable from Railway.

Mitigation:

- Isolate adapters.
- Add integration health UI.
- Use queues and retries.
- Start with minimal scopes/features.

## 6. Performance expectations

User wants 200–250ms operations.

Risks:

- External APIs and AI cannot reliably meet that.
- Large message feeds may slow search/filter.

Mitigation:

- Cache synced data.
- Use optimistic UI.
- Use async jobs.
- Add indexes and virtualization.
- Clarify that perceived speed is the goal.

## 7. GitHub/Jira linking accuracy

PR-to-ticket linking depends on ticket keys being present in branch/title/body.

Risks:

- Inconsistent naming.
- Missing links.
- Incorrect associations.

Mitigation:

- Start with regex ticket key detection.
- Allow manual corrections later.
- Encourage consistent PR naming.
