# DND-028 · Guard against lost updates before two people can edit one character

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | S |
| Sources | data lens · market lens · `src/app/api/characters/[id]/route.ts:77-85` · `src/lib/db/characters.ts:91-98` · `src/lib/characters/combat.ts:9-13` · `src/lib/db/client.ts:28-30` · register D13 |

## Problem

`PATCH /api/characters/[id]` reads the row, computes the new state, then writes — two round
trips with no version predicate (`route.ts:77-85`, `characters.ts:91-98`). The `neon-http`
driver cannot do transactions (`src/lib/db/client.ts:28-30`), so there is no way to make that
atomic as written.

Today this is benign, and deliberately so: the wire protocol sends absolute values rather than
deltas, and the reasoning at `src/lib/characters/combat.ts:9-13` explicitly considers **one**
device. Single-column races between a player's own two taps resolve harmlessly.

That reasoning expires the moment DND-027 lands. With a DM and a player both able to write one
row, whole-object writes to `spell_slots` (jsonb) and `conditions` (array) silently discard
each other: the DM applies a condition while the player spends a slot, and one of the two
edits vanishes with no error on either phone.

**This is the specific hazard behind the divergence recorded as D13.** The market lens found
that D&D Beyond shipped DM-edits-player-HP, removed it, and now treats player-controls-own-HP
as by-design — concurrency being one of the two visible reasons, the other being table
authority. Jamie has chosen to keep full DM edit anyway. That choice is only safe with this
guard, which is why it is a prerequisite of DND-027's write half rather than a follow-up.

## Acceptance

- [ ] A write that was computed from stale data is rejected rather than silently applied
- [ ] The rejection is distinguishable by the client from a network failure or an auth failure
- [ ] The sheet handles a rejection without losing the player's intent — at minimum it
      re-reads and tells them, rather than silently reverting
- [ ] Array and jsonb columns (`conditions`, `spell_slots`) are covered, not just scalars
- [ ] Existing single-device behaviour does not regress: rapid taps must still coalesce and
      must not start failing
- [ ] CI green

## Prompt

Add a lost-update guard to character writes in the D&D 5e Companion, before a DM and a player
can both edit the same sheet.

`PATCH /api/characters/[id]` currently reads the row, computes, then writes, with no version
check (`src/app/api/characters/[id]/route.ts:77-85` and `src/lib/db/characters.ts:91-98`), and
the `neon-http` driver has no transactions (`src/lib/db/client.ts:28-30`). That is safe today
because only one person can write a given character and the protocol sends absolute values —
see the reasoning at `src/lib/characters/combat.ts:9-13`, which assumes one device. DND-027
breaks that assumption deliberately.

Two viable shapes, and the choice is yours to argue in the PR:

1. **Optimistic concurrency** — add `updated_at` or a `version` integer to the `WHERE` clause,
   and answer 409 when zero rows are affected. Simple, and the client already has an error path
   to extend.
2. **Push the computation into SQL** so the read-modify-write becomes one atomic statement.
   This also halves the round trips on a phone at a table, which is worth something on its own.

Whichever you pick must cover `conditions` (an array) and `spell_slots` (jsonb), where a
whole-object write is exactly what silently discards a concurrent edit — not just the scalar
HP columns.

On the client, `src/components/characters/sheet/use-combat-state.ts` already has an error
mapping at `:20-24` and a rollback path at `:105-112`. A conflict must be distinguishable from
a network failure and must not simply revert the player's tap with no explanation — re-read
and tell them. Note DND-023 is moving where that message renders; check whether it has landed.

**Do not regress single-device behaviour.** `use-combat-state.ts` coalesces rapid taps into
two requests; a version check must not make the second one fail during normal one-handed
tapping. That is the main risk in this ticket — test it.

One open question, recorded in the register and not blocking: whether a player's open sheet
should *live-update* when the DM changes it, and whether it says who did it. This ticket only
has to stop writes being lost. If your design makes live updates cheaper later, say so.

Read `.icm/intake/DND-028-concurrency-guard.md` and `.icm/project.md` for context. Open a PR on
a `claude/` branch; do not run local checks — CI is the source of truth.
