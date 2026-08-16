# DND-031 · Encounters, initiative and monster HP in play

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | L |
| Sources | data lens · product lens · market lens · `src/components/reference/monster-detail.tsx:63-196` · `src/app/page.tsx:331-372` · register D17 |

## Problem

Jamie is about to DM, and the app cannot run a fight. Monsters are readable — the reference
browser has a full stat-block detail view at `monster-detail.tsx:63-196` — but there is no
initiative order, no per-instance monster HP, and no way to express "three goblins, and this
one has 4 hit points left". A repo-wide grep for `encounter|initiative|party` returns only UI
labels; `stats-cards.tsx:68` renders an initiative *modifier*, not an order.

This is the one load-bearing DM feature. The market lens is unambiguous: for in-person DM
tools, the encounter tracker *is* the product — Improved Initiative bills itself as "a free web
app for use at your in-person D&D game", and Shieldmaiden's homepage is a combat tracker.
Monster stat blocks in play are not a second feature; they are the tracker holding a monster
with mutable HP, and the stat-block rendering already exists.

Per register decision D17, encounters **persist** between sessions, and monster HP is tracked
**per instance** — "Goblin 3", not "goblin".

This is the largest ticket on the board and it should probably be split once its shape is
clear. It is written as one because splitting it before the schema is settled would produce
two tickets that fight each other.

## Acceptance

- [ ] A DM can build an encounter from monsters in the reference data, with multiple instances
      of the same monster distinguishable
- [ ] Player characters can be added to an encounter alongside monsters
- [ ] Initiative can be entered or rolled, and the order stepped through by round
- [ ] Each combatant tracks its own current/max/temp HP and conditions
- [ ] Encounters survive a page reload, a phone lock and a week between sessions
- [ ] A monster instance's HP is independent of every other instance of the same monster
- [ ] Only the DM of the campaign can see or run its encounters
- [ ] It works one-handed at 320px — this is used continuously for hours
- [ ] CI green

## Prompt

Build encounter and initiative tracking for the D&D 5e Companion. This is the DM's minute-to-
minute job at the table, and it is the largest single item on the board — read the whole ticket
and `.icm/project.md` before starting, and consider proposing a split once you have the schema
shape.

**Depends on DND-026** (campaigns) and **DND-027** (the viewer predicate). An encounter belongs
to a campaign, and only its DM may see it.

Suggested shape, from the data lens — argue with it if you have better:
`encounters(id, campaign_id, name, round, active_combatant_id)` and
`encounter_combatants(encounter_id, character_id NULL, monster_index NULL, display_name,
initiative, max_hp, current_hp, temp_hp, ac, conditions[])`. A combatant is **either** a
reference to a player character **or** an ad-hoc monster instance — hence the two nullable
columns. Monster HP must be per-instance: three goblins are three rows, each with their own
current HP, not one goblin row with a count.

Per register decision D17 encounters persist between sessions, so this is real tables, not
client state. Keep the migration additive and nullable — the production migration job runs in
parallel with the Vercel deploy (`.github/workflows/db-migrate-production.yml:8-13`).

Reuse what exists. Monster stat blocks already render at
`src/components/reference/monster-detail.tsx:63-196` — a combatant should be able to open its
full stat block without leaving the encounter. The sheet's combat primitives in
`src/lib/characters/combat.ts` already handle HP, temp HP and conditions correctly, including
the absolute-value wire protocol; do not write a second implementation of damage application.
If DND-028's concurrency guard has landed, combatant writes should use it.

**Ergonomics are not optional here.** A DM holds this open for three hours and touches it every
few seconds: advancing the turn, applying damage, toggling a condition. Match the character
sheet's standard — one tap per action, 44px targets, optimistic writes, no modals for common
actions. The sheet's `use-combat-state.ts` is the reference implementation.

One open question in the register, unresolved and worth reading before you design: whether
there is a **shared screen at the table** (TV, tablet) or phones only. Every comparable
in-person tracker ships a player-facing view on a second device — 5e.tools has a dedicated
`inittrackerplayerview.html`, Improved Initiative has Player View. If Jamie has not answered,
build the DM view only and keep the data model from foreclosing a player view later.

It needs a home in the bottom tab bar from DND-029.

Read `.icm/intake/DND-031-encounters-and-initiative.md` and `.icm/project.md` for context. Open
a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
