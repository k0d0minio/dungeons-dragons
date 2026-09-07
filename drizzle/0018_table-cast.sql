ALTER TABLE "campaigns" ADD COLUMN "table_token" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "table_spotlight" jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_table_token_unique" UNIQUE("table_token");