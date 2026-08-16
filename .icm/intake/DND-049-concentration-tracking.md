# DND-049 · Concentration tracking

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | feature |
| Priority | P1 |
| Size | S–M (depends on the decision) |
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

- [ ] **Minimal flag.** A "Concentrating on: ⟨spell⟩" toggle on the sheet (picker over
      known/prepared concentration spells, or free text), visible on the party glance and
      the encounter tracker. Player clears it by hand. Size S.
- [ ] **Wired in.** The flag, plus: applying damage while concentrating surfaces the save
      DC (`max(10, ⌊damage/2⌋)`) as a non-blocking prompt with "kept it / lost it"
      buttons; dropping to 0 HP or gaining `incapacitated`/`stunned`/`paralyzed`/
      `unconscious` clears it automatically; starting a second concentration spell (once
      DND-050's cast flow exists) replaces the first. Size M.
- [ ] **Kill.** Concentration stays table-talk. Record a `> Dropped:` line and move on.

## Acceptance

- [ ] A concentrating character's sheet says so, and on what, at a glance
- [ ] The DM's party glance and the encounter tracker's PC rows show the same
- [ ] Clearing it is one tap; nothing ever rolls a die for the player
- [ ] (Wired-in scope only) damage prompts the DC; auto-clear conditions per SRD 5.1
- [ ] CI green

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
