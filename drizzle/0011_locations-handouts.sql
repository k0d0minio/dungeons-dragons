CREATE TABLE "campaign_handouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"revealed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"image" jsonb,
	"provenance" text,
	"dm_notes" text,
	CONSTRAINT "campaign_handouts_title_not_blank" CHECK (length(btrim("campaign_handouts"."title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "campaign_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"revealed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"description" text,
	"secrets" text,
	"dm_notes" text,
	CONSTRAINT "campaign_locations_name_not_blank" CHECK (length(btrim("campaign_locations"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "campaign_npcs" ADD COLUMN "portrait" jsonb;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "portrait" jsonb;--> statement-breakpoint
ALTER TABLE "campaign_handouts" ADD CONSTRAINT "campaign_handouts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_locations" ADD CONSTRAINT "campaign_locations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_handouts_campaign_id_idx" ON "campaign_handouts" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_locations_campaign_id_idx" ON "campaign_locations" USING btree ("campaign_id");