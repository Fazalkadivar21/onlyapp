# PROJECT.md

## Overview

**mark-1** is a personal hosted workspace that centralizes daily work activity across Slack, WhatsApp, GitHub, Jira, notes, and AI.

The user currently operates between Jira, Slack, WhatsApp, and GitHub, causing too much context switching. The goal is to build one fast app where work updates, messages, action items, sprint status, notes, and AI summaries live together.

## Product objective

Build a modern, simple, fast workspace that helps the user:

- Start the day with a clear Daily Brief.
- See what needs attention in an Action Queue.
- Read and send Slack/WhatsApp messages without opening those apps.
- Track PRs they created, PRs needing review, comments mentioning them, failed checks, and merged PRs.
- Track Jira sprint progress, ticket status changes, assigned tickets, and PRs raised for tickets.
- Take Notion-lite notes linked to activity.
- Use OpenAI, Anthropic, or Ollama APIs for summaries and reply drafts.

## Vision

Short-term: build an Option-B-style unified workspace that reduces app switching.

Long-term: evolve into an Option-C-style AI chief-of-staff that understands work context and proactively tells the user what matters.

## v0.1 scope

v0.1 includes all major modules thinly:

- Daily Brief
- Action Queue
- Unified Inbox
- Slack integration
- WhatsApp integration
- GitHub integration
- Jira integration
- Notes
- AI provider abstraction
- Hosted deployment

v0.1 is not expected to fully replace every edge case of each source app.

## Explicitly out of scope for v0.1

- SaaS/multi-user support
- Billing/subscriptions
- Mobile app
- Full Notion database clone
- Excalidraw/canvas functionality
- Slack reactions/edit/delete
- WhatsApp voice notes/stickers/reactions/edit/delete
- Perfect 250ms external API responses
- Guaranteed WhatsApp reliability
- Local Ollama hosting on Railway

## Tech stack

- TypeScript
- Next.js
- React
- Tailwind CSS
- shadcn/ui or Radix UI
- TanStack Query
- Zustand
- TipTap
- Postgres
- Drizzle ORM
- Redis + BullMQ
- Cloudinary
- OpenAI API
- Anthropic API
- Ollama-compatible API
- Slack API / Events API
- GitHub API / webhooks
- Jira REST API
- Baileys or lightweight WhatsApp Web protocol connector

## Deployment plan

Month 1:

- Railway for app services
- External hosted Postgres, preferably Neon
- Redis via Upstash or Railway Redis
- Cloudinary for media
- OpenAI/Anthropic/Ollama APIs for AI

Later:

- Move to AWS if Railway becomes limiting.
- If WhatsApp connector fails on Railway, move only that service to VPS/AWS first.

## Main product surfaces

### Daily Brief

A morning summary of important activity:

- urgent Slack/WhatsApp messages
- unread selected chats/channels
- PRs needing action
- merged/blocked/failing PRs
- current sprint progress
- Jira ticket changes
- suggested next actions

### Action Queue

A normalized list of items requiring attention:

- Slack mentions/DMs/threads
- WhatsApp messages in selected chats/groups
- GitHub PR updates
- Jira sprint/ticket updates
- AI-detected risks/blockers later

### Unified Inbox

A cross-source feed using normalized `ActivityItem`s with filters by:

- source
- status
- priority
- selected Slack channels
- selected WhatsApp chats/groups
- mentions
- PRs
- sprint events

### Notes

Notion-lite editor with:

- pages
- rich text blocks
- headings
- bullets
- numbered lists
- checkboxes
- basic tables
- slash commands
- linked ActivityItems

### AI

Provider-based AI layer supporting:

- Daily Brief
- Slack thread summary
- WhatsApp chat summary
- PR summary
- sprint summary
- suggested replies

## Success criteria for first month

- Hosted app runs on Railway.
- External DB is connected.
- Cloudinary handles media.
- Slack selected channels work.
- WhatsApp QR login works.
- WhatsApp selected chats sync.
- Slack/WhatsApp message sending works.
- Basic GitHub PR list works.
- Basic Jira sprint view works.
- Daily Brief works with at least one AI provider.
- Notes exist and autosave.
