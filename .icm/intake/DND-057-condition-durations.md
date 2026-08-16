# DND-057 · Condition durations — "until end of next turn" as state, not memory

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | improvement |
| Priority | P2 |
| Size | M |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `src/lib/db/schema.ts:105` · `src/lib/encounters/tracker.ts` · `src/components/characters/sheet/conditions-card.tsx` |

## Problem

Conditions are naked booleans — a `text[]` on the character
(`src/lib/db/schema.ts:105`) and on monster instances. But almost no condition in play
is indefinite: it's *frightened until the end of its next turn*, *stunned until the end
of your next turn*, *restrained until it escapes*. The tracker counts rounds and turns
(`advanceTurn`), so the clock exists; conditions just aren't connected to it. Today the
table remembers expiry or nobody does — and "nobody does" usually favours whoever
forgot.

Honest counterpoint, stated up front: this is the fiddliest ticket in the audit. Expiry
timing in 5e is genuinely awkward ("end of the *caster's* next turn" vs "end of the
*target's* next turn"), durations only make sense inside an encounter while conditions
also live on the sheet outside one, and a wrong auto-expiry is worse than no expiry —
the DM overriding the app mid-fight is exactly the fiddliness this app exists to avoid.
There is a real case that the one-tap clear that already exists *is* the right level of
ambition, with at most a visual nudge.

## Decision — Jamie

- [ ] **Nudge only.** In an encounter, a condition applied to a combatant is stamped
      with the round it was applied; the chip shows its age ("stunned · since rd 2").
      Nothing auto-expires — the DM clears with the existing one tap, now with a memory
      aid. Size S, no wrong answers possible.
- [ ] **Real durations.** A condition can carry "until end of ⟨combatant⟩'s next turn"
      or "for N rounds"; `advanceTurn` expires them and says so in a toast. Size M, and
      the edge cases above must be designed, not discovered.
- [ ] **Kill.** Conditions stay booleans; the table keeps time. `> Dropped:` and done.

## Acceptance

- [ ] (Either scope) conditions outside an encounter are unchanged — the sheet's
      conditions card keeps working exactly as it does
- [ ] (Nudge) every condition chip in the tracker shows when it was applied
- [ ] (Durations) expiry fires at the chosen boundary, announces itself, and is
      one-tap undoable when the app got it wrong
- [ ] The `/table/[token]` screen shows the same condition chips it does today
- [ ] CI green

## Prompt

Jamie has picked a scope in the Decision section of
`.icm/intake/DND-057-condition-durations.md` — read it, and `.icm/project.md` for
context. If killed, `git mv` to `_done/` with a `> Dropped:` line and stop.

Conditions on combatants flow through the encounter tracker
(`src/components/encounters/encounter-tracker.tsx`, `combatant-row.tsx`) and rounds
through `src/lib/encounters/tracker.ts`. The nudge scope only needs an applied-at-round
stamp on the instance data (additive, nullable); the durations scope needs an expiry
rule per condition instance and logic in `advanceTurn` — keep it encounter-side only, do
not add duration columns to the character sheet's conditions. PC condition writes go
through the version-guarded character API; monster writes are tracker-local. Open a PR
on a `claude/` branch; CI is the source of truth.
