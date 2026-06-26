CREATE TABLE "note_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"activity_item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_links" ADD CONSTRAINT "note_links_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_links" ADD CONSTRAINT "note_links_activity_item_id_activity_items_id_fk" FOREIGN KEY ("activity_item_id") REFERENCES "public"."activity_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_links_note_idx" ON "note_links" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "note_links_activity_item_idx" ON "note_links" USING btree ("activity_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "note_links_note_activity_item_idx" ON "note_links" USING btree ("note_id","activity_item_id");