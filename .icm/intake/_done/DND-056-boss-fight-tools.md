> Dropped: kill box exercised — decided by Jamie in the 2026-08-27 estate ticket audit: the app has not yet been played at a real table, so no observed friction backs this convenience; re-cut with evidence if a session proves it missing.

# DND-056 · Boss fights — monster AC on the row, legendary actions, recharge

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | improvement |
| Priority | P2 |
| Size | S–M |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `src/components/encounters/combatant-row.tsx` · `src/lib/encounters/tracker.ts` · `docs/rules/10-dm-guide.md` |

## Problem

The encounter tracker handles a goblin pile well and a dragon badly.

Three separate frictions, in rising order of size:

1. **Monster AC isn't on the combatant row** (`combatant-row.tsx` shows AC for PCs
   only). "Does 17 hit?" is the single most frequent question in combat, and answering
   it means opening the full stat-block sheet, every attack, every round.
2. **Recharge abilities have no tracker.** A breath weapon on "Recharge 5–6" is a
   die-roll-at-turn-start the DM must remember unaided.
3. **Legendary and lair actions exist only in the reference view.** A legendary
   creature's 3-actions-per-round budget has no counter; lair actions on initiative 20
   have no reminder. Running an adult dragon means keeping three counters in your head
   while also being every other monster.

For context on frequency: legendary monsters are boss fights — a few per campaign —
while the AC friction is every attack of every fight. The options are priced accordingly.

## Decision — Jamie

- [ ] **AC on the row only.** Show the monster's AC beside its HP, captured at add time
      like HP already is. Size S, serves every fight.
- [ ] **AC + legendary/lair/recharge.** The above, plus: a legendary-action pip counter
      (3 by default, reset when the creature's turn starts), a lair-action reminder row
      at initiative 20 when the monster has lair actions, and a "roll recharge" nudge at
      the start of the creature's turn for recharge abilities. Size M, serves boss
      fights.
- [ ] **Kill.** The stat-block sheet one tap away is enough. `> Dropped:` and done.

## Acceptance

- [ ] A monster row answers "does N hit?" without opening the stat block
- [ ] (Full scope) legendary pips spend and reset with the turn order via
      `advanceTurn`; lair/recharge reminders appear only for creatures that have them
- [ ] The row stays legible at phone width — this must not crowd the HP buttons
- [ ] The `/table/[token]` screen still never leaks monster AC or ability state
- [ ] CI green

## Prompt

Jamie has picked a scope in the Decision section of
`.icm/intake/DND-056-boss-fight-tools.md` — read it, and `.icm/project.md` for context.
If killed, `git mv` to `_done/` with a `> Dropped:` line and stop.

Monster rows live in `src/components/encounters/combatant-row.tsx`, turn advancement in
`src/lib/encounters/tracker.ts`. AC should be captured onto the combatant instance at
add time (like seeded HP in `add-combatants-sheet.tsx`) so the row never needs a
reference fetch to render — additive nullable column on the combatants table. For the
full scope, legendary/lair/recharge data comes from the monster detail payload; store
what the tracker needs per instance rather than re-fetching. Keep
`getEncounterByShareToken`'s sanitisation intact — the table screen must not gain any of
this. Open a PR on a `claude/` branch; CI is the source of truth.
