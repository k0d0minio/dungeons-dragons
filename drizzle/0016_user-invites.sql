CREATE TABLE "user_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"role" text DEFAULT 'player' NOT NULL,
	"label" text,
	"email" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"claimed_by_user_id" text,
	CONSTRAINT "user_invites_token_unique" UNIQUE("token"),
	CONSTRAINT "user_invites_role_known" CHECK ("user_invites"."role" in ('dm', 'player'))
);
