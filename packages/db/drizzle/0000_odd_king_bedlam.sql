CREATE TYPE "public"."activity_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."activity_source" AS ENUM('slack', 'whatsapp', 'github', 'jira');--> statement-breakpoint
CREATE TYPE "public"."activity_status" AS ENUM('unread', 'seen', 'done', 'snoozed');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('disconnected', 'connected', 'error');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "activity_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "activity_source" NOT NULL,
	"source_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"actor_name" text NOT NULL,
	"actor_avatar" text,
	"url" text,
	"priority" "activity_priority" DEFAULT 'normal' NOT NULL,
	"status" "activity_status" DEFAULT 'unread' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"encrypted_payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" "integration_status" DEFAULT 'disconnected' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "activity_source" NOT NULL,
	"conversation_id" text NOT NULL,
	"external_id" text,
	"sender_name" text NOT NULL,
	"body" text NOT NULL,
	"status" "message_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "integration_secrets" ADD CONSTRAINT "integration_secrets_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activity_items_source_source_id_idx" ON "activity_items" USING btree ("source","source_id");--> statement-breakpoint
CREATE INDEX "activity_items_source_idx" ON "activity_items" USING btree ("source");--> statement-breakpoint
CREATE INDEX "activity_items_status_idx" ON "activity_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "activity_items_created_at_idx" ON "activity_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_items_priority_status_idx" ON "activity_items" USING btree ("priority","status");--> statement-breakpoint
CREATE INDEX "ai_summaries_type_created_at_idx" ON "ai_summaries" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "messages_source_conversation_idx" ON "messages" USING btree ("source","conversation_id");--> statement-breakpoint
CREATE INDEX "messages_status_updated_at_idx" ON "messages" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notes_updated_at_idx" ON "notes" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "sync_jobs_source_status_idx" ON "sync_jobs" USING btree ("source","status");--> statement-breakpoint
CREATE INDEX "sync_jobs_updated_at_idx" ON "sync_jobs" USING btree ("updated_at");