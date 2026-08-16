CREATE TABLE "campaign_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"session_date" date DEFAULT current_date NOT NULL,
	"body" text NOT NULL,
	"shared_with_players" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_notes_body_not_blank" CHECK (length(btrim("campaign_notes"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "character_notes" (
	"character_id" uuid PRIMARY KEY NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_notes" ADD CONSTRAINT "campaign_notes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_notes" ADD CONSTRAINT "character_notes_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_notes_campaign_id_idx" ON "campaign_notes" USING btree ("campaign_id");