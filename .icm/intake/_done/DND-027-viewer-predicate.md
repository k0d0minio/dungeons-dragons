# DND-027 · Replace owner-scoping with a viewer predicate, so a DM can read and edit their party

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | M |
| Sources | data lens · product lens · `src/lib/db/characters.ts:3-7,40,49,62,84,101` · `src/app/api/characters/[id]/route.ts:5-6,39,78,82` · register D13 |

## Problem

Owner-scoping in this app is not a policy that can be swapped — it is hard-coded as the first
positional argument of all five data functions and folded into every `WHERE` clause.
`src/lib/db/characters.ts:40,49,62,84,101` are each `(ownerId, …)` with
`eq(characters.ownerId, ownerId)`, and the file header at `:3-7` states plainly: *"That is the
whole security model for character data — there is no row-level security policy behind this."*

So the business rule agreed on 2026-08-15 — a DM sees and edits every character in a campaign
they run, a player still sees only their own — is not expressible without changing all five
functions and their four call sites (`src/app/api/characters/route.ts:50,93`,
`src/app/api/characters/[id]/route.ts:39,78,82`, `src/app/characters/page.tsx`,
`src/app/characters/[id]/page.tsx:56`).

**One semantic deliberately changes.** `[id]/route.ts:5-6` conflates "not yours" with "does
not exist", returning 404 so a foreign id cannot be probed for existence. That property must
survive for players — but for a DM, "not yours" becomes "yours to edit". The predicate becomes
roughly `owner_id = $1 OR id IN (characters of campaigns where $1 is DM)`.

**This is a security boundary.** Getting the predicate wrong in the permissive direction means
any user can read any character. It deserves tests that assert the negative cases, not just
the positive ones.

## Acceptance

- [ ] A DM can read and edit every character in a campaign they run
- [ ] A player can read and edit only their own, exactly as today
- [ ] A character in no campaign behaves exactly as it does today
- [ ] A non-DM, non-owner still gets 404 — not 403, and not a different response from a
      genuinely missing id
- [ ] Tests assert the negative cases: a player cannot reach another player's character in the
      same campaign; a DM cannot reach a character in a campaign they do not run
- [ ] The access rule lives in one place rather than being re-derived per route
- [ ] CI green

## Prompt

Replace owner-scoping with a viewer predicate in the D&D 5e Companion, so that a DM can read
and edit the characters in a campaign they run while players still see only their own.

**Depends on DND-026** (campaigns and membership tables). Do not start until that has landed.

Today every read is owner-scoped by construction: all five functions in
`src/lib/db/characters.ts` take `ownerId` as their first argument and fold
`eq(characters.ownerId, ownerId)` into the query — the header comment at `:3-7` says this is
the entire security model. Replace that with a viewer concept: who is asking, and what may
they reach. The predicate is roughly `owner_id = viewer OR character is in a campaign where
viewer is the DM`.

Update the four call sites: `src/app/api/characters/route.ts:50,93`,
`src/app/api/characters/[id]/route.ts:39,78,82`, `src/app/characters/page.tsx` and
`src/app/characters/[id]/page.tsx:56`.

**Preserve one deliberate property.** `src/app/api/characters/[id]/route.ts:5-6` returns 404
rather than 403 for a character you cannot see, so a foreign id is indistinguishable from a
missing one. Keep that for players. For a DM, the same id becomes reachable — that is the
point of the ticket.

**This is a security boundary, so test the negatives.** A player must not reach another
player's character even when both are in the same campaign. A DM must not reach a character in
a campaign they do not run. A character belonging to no campaign must behave exactly as it does
today. Put the rule in one place — a single predicate builder or equivalent — rather than
re-deriving it in each route, because a rule written five times is a rule that will drift.

Per register decision D13, the DM's write access **includes live combat state** (HP, slots,
conditions, death saves), not only the character's build. That is a deliberate divergence from
how comparable tools settled — D&D Beyond shipped DM-edits-player-HP and then removed it — and
it creates a two-writer problem on a single row. **DND-028 is a hard prerequisite of shipping
the write half.** Either land DND-028 first, or land the read half here and gate writes behind
it; say in the PR which you did.

Read `.icm/intake/DND-027-viewer-predicate.md` and `.icm/project.md` for context. Open a PR on
a `claude/` branch; do not run local checks — CI is the source of truth.
