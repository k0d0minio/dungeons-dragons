# DND-049 · Concentration tracking

| | |
|---|---|
| Status | done — **Minimal flag** picked (Jamie, 2026-08-16) |
| Type | feature |
| Priority | P1 |
| Size | S |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `src/components/reference/spell-detail.tsx:43` · `src/lib/characters/combat.ts:21` · `docs/rules/06-spellcasting.md` |

## Problem

Concentration is the most-forgotten rule at a real table, and the app is completely silent
on it. The reference spell detail renders a "Concentration" badge
(`spell-detail.tsx:43`) — and then nothing anywhere consumes it. `CombatState`
(`src/lib/characters/combat.ts:21`) has no concentration field, the sheet has no
indicator, taking damage prompts nothing, and the DM's party glance cannot show who is
concentrating on what. A druid holding *Moonbeam* who takes a hit is supposed to make a
Con save at DC `max(10, ⌊damage/2⌋)` or lose the spell; today the app can't even remind
anyone the spell was up.

This sits squarely in the app's stated job — "hold the character's live state for three
hours" — and it is state, not rolling: physical dice stay the point (D8), the app only
needs to *remember* and *prompt*.

## Decision — Jamie

Pick a scope (or kill it):

- [x] **Minimal flag.** A "Concentrating on: ⟨spell⟩" toggle on the sheet (picker over
      known/prepared concentration spells, or free text), visible on the party glance and
      the encounter tracker. Player clears it by hand. Size S.
- [ ] **Wired in.** The flag, plus: applying damage while concentrating surfaces the save
      DC (`max(10, ⌊damage/2⌋)`) as a non-blocking prompt with "kept it / lost it"
      buttons; dropping to 0 HP or gaining `incapacitated`/`stunned`/`paralyzed`/
      `unconscious` clears it automatically; starting a second concentration spell (once
      DND-050's cast flow exists) replaces the first. Size M.
- [ ] **Kill.** Concentration stays table-talk. Record a `> Dropped:` line and move on.

> Picked: **Minimal flag** (Jamie, 2026-08-16). Stated in session — the boxes above were
> still unticked in the file when the work started, so the scope was asked for rather
> than read off the ticket.

## Acceptance

- [x] A concentrating character's sheet says so, and on what, at a glance
- [x] The DM's party glance and the encounter tracker's PC rows show the same
- [x] Clearing it is one tap; nothing ever rolls a die for the player
- [ ] (Wired-in scope only) damage prompts the DC; auto-clear conditions per SRD 5.1 —
      n/a, **Minimal flag** was the scope picked
- [x] CI green — PR #40, run 31963270995 (lint, typecheck, format, test) and 31963271034
      (branch and migrate), 2026-08-16

> Marked done: Jamie, 2026-08-16.

## What shipped

- **`concentration` on the combat state** — `Concentration = { index: string | null, name:
  string }` in `src/lib/db/schema.ts`, `CombatState.concentration` in
  `src/lib/characters/combat.ts`. One nullable value, not a list, because 5e allows
  exactly one effect at a time; `index` is the dnd5eapi spell index when the pick came
  off the character's own list and `null` when the name was typed, and `name` is always
  what every surface renders, so a row the reference API never heard of still reads.
- **`drizzle/0006_concentration.sql`** — `ALTER TABLE "characters" ADD COLUMN
  "concentration" jsonb;`. Additive and nullable with no default, so a row written before
  it reads as "not concentrating", which is exactly what it was, and the deploy/migrate
  window stays safe.
- **`setConcentration(state, concentration | null)`** — one absolute transition, like
  every other in that file. Starting a second effect *is* dropping the first, so there is
  no add/remove pair to get out of step. Blank names clear rather than store an empty
  chip; setting what is already set returns the same object, which is how
  `use-combat-state.ts` knows a tap cost nothing and skips the request. It rides the same
  409 version guard as everything else — no new write path.
- **`concentration-card.tsx`** on the sheet, placed beside the spell slots: a
  spellcasting state, consulted every time the character takes a hit, and legible without
  scrolling to the middle of the sheet. The active effect *is* the drop button — one tap,
  no trip through the picker — with the spell's rules an Info tap away when the pick had
  an index. The DND-023 order is untouched: hit points first, slots above conditions.
- **The picker** offers what the character could have cast (prepared if their class
  prepares, known otherwise) as a filter box over `searchByName`, plus free text for the
  same box. It is rendered for every character, not just casters: a wand, a readied spell
  and a DM's amulet all need concentrating on, and hiding the card from a fighter hides
  it from the player likeliest to forget.
- **DM surfaces.** `party-glance.tsx` leads each row's badges with "Concentrating: ⟨X⟩";
  the encounter tracker's PC rows show the same and let the DM *drop* it in one tap —
  they are the one who says "you failed the save" — through the same D13 write-through
  the HP buttons use, version guard and all. It never *sets* the flag; starting an effect
  is the player's own tap. Monster rows get nothing: a combatant instance has no such
  column.

**Deliberately not done:**

- **The picker is not filtered to concentration spells**, and cannot cheaply be: neither
  `/spells` nor `/classes/{index}/spells` carries the `concentration` flag — only the
  per-spell detail does — so filtering a cleric's eighty prepared spells would be eighty
  fetches to open one card. The card offers the list and trusts the player, who has the
  spell in front of them. Worth revisiting only if the proxy ever grows a projected list.
- **Everything in the wired-in scope**: no damage prompt with the DC, no auto-clear at
  0 HP or on `incapacitated`/`stunned`/`paralyzed`/`unconscious`, and the cast flow does
  not set the flag. DND-050 landed in the meantime and left the hook for that last one
  ("one line in the confirm handler"), but "casting a second concentration spell replaces
  the first" is listed under **Wired in**, not here. It is the obvious follow-up ticket.

## Prompt

Jamie has decided the scope of concentration tracking for the D&D 5e Companion — read the
Decision section of `.icm/intake/DND-049-concentration-tracking.md` for which option, and
`.icm/project.md` for context. If the decision is "kill", `git mv` this ticket to
`_done/` with a `> Dropped:` line and stop.

Otherwise: add a concentration field to the sheet's combat state
(`src/lib/characters/combat.ts` and the `characters` table — remember migrations must be
additive and nullable). Surface it on the sheet as a card or a line in the conditions
card, on the DM party glance (`src/components/campaigns/party-glance.tsx`), and on the
encounter tracker's PC rows. The rules live in `docs/rules/06-spellcasting.md`. Follow
the optimistic-write pattern in `use-combat-state.ts` — the field rides the same 409
version guard as everything else. Open a PR on a `claude/` branch; CI is the source of
truth.
