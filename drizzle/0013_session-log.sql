ALTER TABLE "campaign_notes" ADD COLUMN "session_closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "encounters" ADD COLUMN "completed_at" timestamp with time zone;