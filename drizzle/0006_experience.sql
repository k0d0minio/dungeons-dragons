ALTER TABLE "characters" ADD COLUMN "experience" integer;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_experience_positive" CHECK ("characters"."experience" >= 0);