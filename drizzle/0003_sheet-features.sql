CREATE TABLE "character_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"equipment_index" text,
	"custom_name" text,
	"quantity" smallint DEFAULT 1 NOT NULL,
	"equipped" boolean DEFAULT false NOT NULL,
	"attuned" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_items_quantity_positive" CHECK ("character_items"."quantity" >= 1),
	CONSTRAINT "character_items_named" CHECK ("character_items"."equipment_index" is not null or "character_items"."custom_name" is not null)
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "exhaustion" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "hit_dice_used" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "class_resources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "cp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "sp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "ep" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "gp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "pp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "skill_proficiencies" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "skill_expertise" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "character_items" ADD CONSTRAINT "character_items_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "character_items_character_id_idx" ON "character_items" USING btree ("character_id");--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_exhaustion_range" CHECK ("characters"."exhaustion" between 0 and 6);--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_hit_dice_used_positive" CHECK ("characters"."hit_dice_used" >= 0);--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_cp_positive" CHECK ("characters"."cp" >= 0);--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_sp_positive" CHECK ("characters"."sp" >= 0);--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_ep_positive" CHECK ("characters"."ep" >= 0);--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_gp_positive" CHECK ("characters"."gp" >= 0);--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_pp_positive" CHECK ("characters"."pp" >= 0);--> statement-breakpoint
-- Data migration (DND-038), hand-appended: exhaustion used to be a boolean
-- chip in the `conditions` array; it is a 0-6 level column now. Any row with
-- the chip set becomes at least level 1 (GREATEST keeps a level a concurrent
-- writer may already have raised), and the chip leaves the array so the
-- condition cannot be double-tracked. Rows without the chip are untouched.
UPDATE "characters"
SET "exhaustion" = GREATEST("exhaustion", 1),
    "conditions" = array_remove("conditions", 'exhaustion')
WHERE 'exhaustion' = ANY("conditions");
