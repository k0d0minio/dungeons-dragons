CREATE TABLE "encounter_combatants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"character_id" uuid,
	"monster_index" text,
	"label" text NOT NULL,
	"initiative" smallint,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"max_hit_points" integer,
	"current_hit_points" integer,
	"temporary_hit_points" integer DEFAULT 0 NOT NULL,
	"conditions" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encounter_combatants_label_not_blank" CHECK (length(btrim("encounter_combatants"."label")) > 0),
	CONSTRAINT "encounter_combatants_temporary_hit_points_positive" CHECK ("encounter_combatants"."temporary_hit_points" >= 0),
	CONSTRAINT "encounter_combatants_identified" CHECK ("encounter_combatants"."character_id" is not null or "encounter_combatants"."monster_index" is not null)
);
--> statement-breakpoint
CREATE TABLE "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"round" smallint DEFAULT 1 NOT NULL,
	"active_turn" smallint DEFAULT 0 NOT NULL,
	"share_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encounters_share_token_unique" UNIQUE("share_token"),
	CONSTRAINT "encounters_name_not_blank" CHECK (length(btrim("encounters"."name")) > 0),
	CONSTRAINT "encounters_round_positive" CHECK ("encounters"."round" >= 1),
	CONSTRAINT "encounters_active_turn_positive" CHECK ("encounters"."active_turn" >= 0)
);
--> statement-breakpoint
ALTER TABLE "encounter_combatants" ADD CONSTRAINT "encounter_combatants_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_combatants" ADD CONSTRAINT "encounter_combatants_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "encounter_combatants_encounter_id_idx" ON "encounter_combatants" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "encounters_campaign_id_idx" ON "encounters" USING btree ("campaign_id");