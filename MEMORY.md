# MEMORY.md

Persistent memory for future agents.

## User intent

The user is overwhelmed by switching between Jira, Slack, WhatsApp, GitHub, notes, and AI tools. They want one fast app where they can operate daily work.

The app should make their life easier by centralizing attention, messages, sprint status, PR status, notes, and summaries.

## Strong user preferences

- Wants a workspace, not just an inbox.
- Wants WhatsApp personal chats/groups inside the app.
- Wants to send messages from the app, not just open external links.
- Wants selected Slack channels, not all channels.
- Wants selected WhatsApp chats/groups.
- Wants a modern, simple UI.
- Wants operations to feel very fast.
- Wants OpenAI, Claude, and Ollama API support.
- Wants hosted deployment, not local-only.
- Is okay with unofficial WhatsApp risk.
- Is okay with thin v0.1 modules.

## Product phrase

Use this as the mental model:

> mark-1 is a personal command workspace for work communication, PR/sprint awareness, notes, and AI summaries.

## Key constraints

- Railway month-1 deployment.
- 0.5 GB RAM per Railway service.
- External DB preferred.
- Cloudinary for images/videos/files.
- Ollama is remote API only.
- WhatsApp connector must be lightweight.

## Do not forget

- Excalidraw was explicitly ditched.
- WhatsApp is critical.
- Sending messages is critical.
- Opening links back to Slack/WhatsApp is not enough.
- AI should not come before messaging foundation.
- The app is personal first, not SaaS.

## Recommended first coding move

Scaffold the monorepo and build the UI shell with mock ActivityItems before deep integrations.
