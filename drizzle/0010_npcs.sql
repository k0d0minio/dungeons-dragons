CREATE TABLE "campaign_npcs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"revealed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"description" text,
	"motivation" text,
	"secrets" text,
	"twist" text,
	"stat_reference" text,
	"dm_notes" text,
	CONSTRAINT "campaign_npcs_name_not_blank" CHECK (length(btrim("campaign_npcs"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "campaign_npcs" ADD CONSTRAINT "campaign_npcs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_npcs_campaign_id_idx" ON "campaign_npcs" USING btree ("campaign_id");