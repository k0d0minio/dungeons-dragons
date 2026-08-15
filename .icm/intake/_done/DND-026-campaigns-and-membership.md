# DND-026 · Campaigns and party membership — the substrate the DM role needs

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | M |
| Sources | data lens · product lens · `src/lib/db/schema.ts:50-119,96-97` · `drizzle/meta/_journal.json` · project register D12, D13, D14 |

## Problem

The DM permission model decided on 2026-08-15 has nowhere to attach. There is exactly one
table — `characters` — keyed only by `owner_id`, with no concept of a party, a campaign, or a
DM. The schema says so itself at `src/lib/db/schema.ts:96-97`: *"Every read is owner-scoped;
this is the only access pattern v1 has."* `drizzle/meta/_journal.json` has a single entry.

Every DM feature now agreed — a DM editing player characters (DND-027), the party glance
(DND-030), encounters (DND-031), campaign notes — needs this substrate first. This ticket is
that substrate and nothing else: tables and a migration, no UI, no permission change.

**Decisions already made, do not re-litigate.** Per register D14, a character may belong to
**several** campaigns, so membership is a join table rather than a column on `characters`. Per
D15, multiclassing is out.

**The migration must be additive and nullable.** The production migration workflow runs in
parallel with the Vercel deploy by design (`.github/workflows/db-migrate-production.yml:8-13`),
so there is a live window — usually under a minute — where new code runs against an
un-migrated database. A `NOT NULL` add is an outage. Existing production rows must stay
campaign-less and behave exactly as they do today.

Note that `owner_id` is deliberately plain `text` with **no** foreign key to `neon_auth.user`
(`schema.ts:35-43`), with a follow-up migration promised that never came. Every new table here
faces the same choice, and there is currently no cascade anywhere — a deleted auth user's rows
orphan permanently. Settle that policy once, in this ticket, rather than six times.

## Acceptance

- [ ] `campaigns` and `campaign_members` exist, with a DM and members
- [ ] A character can be associated with more than one campaign
- [ ] The migration is purely additive and nullable — existing rows need no backfill and
      behave unchanged
- [ ] Indexes exist for the access patterns DND-027 will need: characters by campaign, and
      campaigns by DM
- [ ] The foreign-key and deletion policy for `owner_id`-style columns is decided and applied
      consistently across the new tables, and written down
- [ ] Owner-scoped behaviour is **unchanged** by this ticket — no route, guard or query
      changes its access rule here
- [ ] CI green

## Prompt

Add the campaigns substrate to the D&D 5e Companion. This is schema and data-layer work only —
no UI, and no change to who can see what. That comes next, in DND-027.

Today `src/lib/db/schema.ts` holds one table, `characters`, keyed by `owner_id`, and its own
comment at `:96-97` says owner-scoping is the only access pattern v1 has. Jamie is about to DM,
and every DM feature needs a party to scope to.

Build roughly: `campaigns` (id, dm_user_id, name, timestamps) and `campaign_members`
(campaign_id, user_id, role) — plus the character↔campaign association. **A character may
belong to several campaigns** (register decision D14), so that association is a join table, not
a `campaign_id` column on `characters`. Add indexes for the two queries DND-027 will run:
characters in a campaign, and campaigns run by a given DM.

**The migration must be additive and nullable.** The production migration job runs in parallel
with the Vercel deploy by design (see the comment at
`.github/workflows/db-migrate-production.yml:8-13`), so there is a live window where new code
meets an un-migrated database — a `NOT NULL` add is an outage. Existing production characters
must keep working with no campaign at all.

While you are here, settle a policy that is currently unmade: `owner_id` is plain `text` with
no foreign key to `neon_auth.user` and no cascade anywhere (see the rationale at
`schema.ts:35-43`), so a deleted auth user's characters orphan permanently. Six new tables are
coming; decide once whether these reference `neon_auth` with a real FK and what happens on
delete, apply it consistently, and write the reasoning into the schema comments the way the
existing ones are written.

Do not change any access rule in this ticket. `src/lib/db/characters.ts` keeps its `ownerId`
signatures and every route keeps its current guard — DND-027 replaces those deliberately, and
mixing the two makes both impossible to review. The existing CHECK constraints at
`schema.ts:104-117` are an asset; follow that pattern for new tables.

Read `.icm/intake/DND-026-campaigns-and-membership.md` and `.icm/project.md` for context. Open
a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
