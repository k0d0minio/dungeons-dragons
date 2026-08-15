CREATE TABLE "user_roles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'player' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_role_known" CHECK ("user_roles"."role" in ('dm', 'player'))
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "join_code" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_join_code_unique" UNIQUE("join_code");--> statement-breakpoint
-- Seed the global roles (DND-047, D19): jamie.nisbet@outlook.be runs the game,
-- every user existing at migration time is a player, and any user with no row
-- at all reads as a player in the app — so future sign-ups need no hook.
--
-- Defensive on purpose. neon_auth is owned by Neon's managed auth service, and
-- this role's grants on it are not ours to assume — drizzle/0001 originally
-- failed in production for exactly that reason (REFERENCES). If the lookup is
-- impossible the migration WARNS and completes rather than blocking the
-- deploy; the by-hand INSERT for that case is in
-- .icm/docs/db-migrations-deploy.md.
DO $$
BEGIN
  IF to_regclass('neon_auth."user"') IS NOT NULL
     AND has_table_privilege(current_user, 'neon_auth."user"', 'SELECT') THEN
    INSERT INTO "user_roles" ("user_id", "role")
    SELECT u."id",
           CASE WHEN lower(u."email") = 'jamie.nisbet@outlook.be' THEN 'dm' ELSE 'player' END
    FROM neon_auth."user" u
    ON CONFLICT ("user_id") DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM "user_roles" WHERE "role" = 'dm') THEN
      RAISE WARNING 'user_roles seeded, but no row matched the DM email — grant it by hand (see .icm/docs/db-migrations-deploy.md)';
    END IF;
  ELSE
    RAISE WARNING 'neon_auth."user" is not readable from here; user_roles left unseeded. Everyone defaults to player until the DM row is inserted by hand (see .icm/docs/db-migrations-deploy.md).';
  END IF;
END $$;
