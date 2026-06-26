import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const activitySource = pgEnum("activity_source", ["slack", "whatsapp", "github", "jira"]);
export const activityStatus = pgEnum("activity_status", ["unread", "seen", "done", "snoozed"]);
export const activityPriority = pgEnum("activity_priority", ["low", "normal", "high", "urgent"]);
export const integrationStatus = pgEnum("integration_status", ["disconnected", "connected", "error"]);
export const messageStatus = pgEnum("message_status", ["pending", "sent", "failed"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  status: integrationStatus("status").notNull().default("disconnected"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const integrationSecrets = pgTable("integration_secrets", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").notNull().references(() => integrations.id),
  encryptedPayload: text("encrypted_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const activityItems = pgTable("activity_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: activitySource("source").notNull(),
  sourceId: text("source_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  actorName: text("actor_name").notNull(),
  actorAvatar: text("actor_avatar"),
  url: text("url"),
  priority: activityPriority("priority").notNull().default("normal"),
  status: activityStatus("status").notNull().default("unread"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("activity_items_source_source_id_idx").on(table.source, table.sourceId),
  index("activity_items_source_idx").on(table.source),
  index("activity_items_status_idx").on(table.status),
  index("activity_items_created_at_idx").on(table.createdAt),
  index("activity_items_priority_status_idx").on(table.priority, table.status)
]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: activitySource("source").notNull(),
  conversationId: text("conversation_id").notNull(),
  externalId: text("external_id"),
  senderName: text("sender_name").notNull(),
  body: text("body").notNull(),
  status: messageStatus("status").notNull().default("pending"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("messages_source_conversation_idx").on(table.source, table.conversationId),
  index("messages_status_updated_at_idx").on(table.status, table.updatedAt),
  index("messages_created_at_idx").on(table.createdAt)
]);

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("notes_updated_at_idx").on(table.updatedAt)]);

export const noteLinks = pgTable("note_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  noteId: uuid("note_id").notNull().references(() => notes.id),
  activityItemId: uuid("activity_item_id").notNull().references(() => activityItems.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("note_links_note_idx").on(table.noteId),
  index("note_links_activity_item_idx").on(table.activityItemId),
  uniqueIndex("note_links_note_activity_item_idx").on(table.noteId, table.activityItemId)
]);

export const aiSummaries = pgTable("ai_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("ai_summaries_type_created_at_idx").on(table.type, table.createdAt)]);

export const syncJobs = pgTable("sync_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  status: text("status").notNull(),
  error: text("error"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("sync_jobs_source_status_idx").on(table.source, table.status),
  index("sync_jobs_updated_at_idx").on(table.updatedAt)
]);
