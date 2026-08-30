ALTER TABLE "characters" ADD COLUMN "background_index" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "background_ability_spread" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "background_abilities" text[];--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "origin_feat_index" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "subclass_index" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "mastered_weapon_indexes" text[];--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "heroic_inspiration" boolean;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_background_abilities_size" CHECK (cardinality("characters"."background_abilities") <= 3);--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_mastered_weapon_indexes_size" CHECK (cardinality("characters"."mastered_weapon_indexes") <= 8);