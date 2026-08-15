# DND-035 · Inventory, first slice — equipped weapons, armour and currency

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P2 |
| Size | M |
| Sources | data lens · market lens · `src/lib/db/schema.ts:52-93` · `src/lib/dnd-api/swr-hooks.ts:429,449` |

## Problem

There is nowhere to store what a character carries — no items, no quantities, no equipped or
attuned flags, no coin (`src/lib/db/schema.ts:52-93`). The equipment reference data is already
proxied and browsable, but it connects to nothing; equipment is a lookup-only tab.

**This ticket is deliberately the first slice, not the whole ledger.** The market lens found
inventory is a primary tab in every comparable tool *and* the heaviest thing to maintain on a
phone — the full item-by-item ledger is precisely the part people keep on paper. The part that
earns its place is the equipped weapon and armour, because that is what produces an attack bonus,
a damage die and an AC. Currency comes along because it is three integers and the single most
common between-sessions edit.

A trap worth knowing before you start: `src/lib/dnd-api/swr-hooks.ts:429,449` already contain
`useWeapons()` and `useArmor()`, fetching `/api/dnd5e/equipment-categories/weapon` and
`/equipment-categories/armor`. **Neither route exists.** They are exported from the public
`dndApiHooks` object, so they read as supported surface; the first person to wire inventory hits
a 404. DND-039 is scheduled to delete them as dead code — this ticket is the one that would
rather they were built.

Attunement note: 5e caps attunement at three items. That belongs in application logic, not a
database CHECK, because homebrew breaks it.

## Acceptance

- [ ] A character has equipped weapons and armour, chosen from the reference data
- [ ] Equipped armour contributes to AC rather than AC being typed by hand
- [ ] Currency (cp/sp/ep/gp/pp) is stored and editable
- [ ] Attunement is representable, with the three-item cap enforced in app logic and overridable
- [ ] The equipment reference tab can add an item to a character without leaving it
- [ ] The migration is additive and nullable
- [ ] Scope is explicit: what is in this slice and what is deferred, recorded in the ticket or
      the register
- [ ] CI green

## Prompt

Add the first slice of inventory to the D&D 5e Companion: equipped weapons and armour, plus
currency. Not the full ledger.

Nothing about carried gear exists today — `src/lib/db/schema.ts:52-93` has no item, quantity,
equipped, attuned or currency columns, so the browsable equipment reference connects to nothing.

**Read the scope boundary before designing.** Comparable tools all have a full inventory tab, and
it is also the part players most often keep on paper because maintaining it on a phone is
tedious. What genuinely earns its place is the equipped weapon and armour, because those produce
an attack bonus, a damage die and an AC — real numbers the sheet currently cannot compute. Build
that. Carrying capacity, encumbrance and a complete item-by-item ledger are explicitly out of
this slice; if you think one of them is load-bearing, argue it in the PR rather than adding it.

Suggested shape from the data lens: `character_items(character_id, equipment_index NULL,
custom_name NULL, quantity, equipped, attuned, notes)` plus `cp/sp/ep/gp/pp` columns on
`characters`. The nullable pair lets an item be either a reference-data item or something
homebrew. Keep the migration additive and nullable — the production migration job runs in
parallel with the Vercel deploy.

Attunement caps at three items in 5e. Put that in application logic, not a CHECK constraint,
since homebrew breaks it.

**Two missing routes you will hit immediately.** `src/lib/dnd-api/swr-hooks.ts:429,449` already
define `useWeapons()` and `useArmor()` pointing at `/api/dnd5e/equipment-categories/weapon` and
`/equipment-categories/armor` — neither route file exists, so both 404. Build those routes,
following the caching pattern DND-020 established for the other proxy handlers. Note DND-039 is
scheduled to delete those hooks as dead code; whichever lands second should reconcile, so say in
your PR that you are keeping them.

**Pairs with DND-034** (attacks on the sheet), which is what makes an equipped weapon worth
having. If DND-034 has landed, feed it; if not, this ticket still stands on AC and currency.

Read `.icm/intake/DND-035-equipped-weapons-and-currency.md` and `.icm/project.md` for context.
Open a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
