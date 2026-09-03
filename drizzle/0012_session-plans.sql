CREATE TABLE "campaign_session_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"revealed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"session_date" date,
	"strong_start" text,
	"treasure" text,
	CONSTRAINT "campaign_session_plans_title_not_blank" CHECK (length(btrim("campaign_session_plans"."title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "session_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_plan_items_body_not_blank" CHECK (length(btrim("session_plan_items"."body")) > 0),
	CONSTRAINT "session_plan_items_sort_order_positive" CHECK ("session_plan_items"."sort_order" >= 0),
	CONSTRAINT "session_plan_items_kind_known" CHECK ("session_plan_items"."kind" in ('scene', 'secret'))
);
--> statement-breakpoint
CREATE TABLE "session_plan_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"npc_id" uuid,
	"location_id" uuid,
	"encounter_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_plan_links_one_target" CHECK (("session_plan_links"."npc_id" is not null)::int + ("session_plan_links"."location_id" is not null)::int + ("session_plan_links"."encounter_id" is not null)::int = 1)
);
--> statement-breakpoint
ALTER TABLE "campaign_session_plans" ADD CONSTRAINT "campaign_session_plans_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_plan_items" ADD CONSTRAINT "session_plan_items_plan_id_campaign_session_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."campaign_session_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_plan_links" ADD CONSTRAINT "session_plan_links_plan_id_campaign_session_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."campaign_session_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_plan_links" ADD CONSTRAINT "session_plan_links_npc_id_campaign_npcs_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."campaign_npcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_plan_links" ADD CONSTRAINT "session_plan_links_location_id_campaign_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."campaign_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_plan_links" ADD CONSTRAINT "session_plan_links_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_session_plans_campaign_id_idx" ON "campaign_session_plans" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "session_plan_items_plan_id_idx" ON "session_plan_items" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "session_plan_links_plan_id_idx" ON "session_plan_links" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_plan_links_plan_npc_idx" ON "session_plan_links" USING btree ("plan_id","npc_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_plan_links_plan_location_idx" ON "session_plan_links" USING btree ("plan_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_plan_links_plan_encounter_idx" ON "session_plan_links" USING btree ("plan_id","encounter_id");