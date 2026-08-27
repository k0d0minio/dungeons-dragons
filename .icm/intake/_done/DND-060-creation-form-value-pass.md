> Dropped: kill box exercised — decided by Jamie in the 2026-08-27 estate ticket audit: the app has not yet been played at a real table, so no observed friction backs this convenience; re-cut with evidence if a session proves it missing.

# DND-060 · Creation form value pass — or revive the wizard

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | improvement |
| Priority | P2 |
| Size | M (incremental) / L (wizard) |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `src/components/characters/character-form.tsx` · `src/lib/characters/schema.ts` · `docs/rules/03-character-creation.md` |

## Problem

The creation form's framing is honest — "For a build you have already made. Fill in what
your sheet says" (D6) — but several of its fields ask the player to hand-compute things
the app already knows:

- **Level-1 max HP** is a typed number defaulting to 10, though the rule is exactly
  `hit die max + Con modifier` and both inputs are on the same form. The hit-die math
  exists in the codebase — but only fires on level-*up*.
- **Racial ability bonuses** are silently ignored: pick a dwarf, type your scores, and
  nothing mentions the +2 Con. The race payload carries `ability_bonuses`.
- **No generation help** — no standard array, no point-buy validation; six raw boxes.
- **Starting equipment** is rendered in the reference class detail and never offered;
  every new character begins with an empty inventory and builds it by hand in the
  inventory picker.

Each of these is a place where a new player (this table is friends and family) can
quietly get their character wrong. The register lists the guided wizard as `wanted`
(its old ticket died with the board, D9) — so the real decision is whether to spend on
incremental fixes to the flat form or on the wizard that replaces it. Doing both in
sequence wastes the first.

## Decision — Jamie

- [ ] **Incremental fixes, wizard stays shelved.** Derive the level-1 HP placeholder,
      show racial bonuses as an advisory hint (or an "apply +2/+1" tap), add a
      standard-array one-tap fill, offer the class's starting-equipment package as a
      "add these to inventory" option after creation. The form stays one page. Size M.
- [ ] **Revive the guided wizard.** Multi-step creation (class → race → abilities →
      skills → spells → equipment) with the rules applied as you go; the flat form
      stays for people with a finished build. Size L — and it should get its own ticket
      cut from this one, since a wizard needs its own design pass.
- [ ] **Kill.** The form's "you already made your build" framing is the product stance;
      the paper sheet or D&D Beyond does the building. `> Dropped:` and done.

## Acceptance (incremental scope)

- [ ] Level-1 HP defaults to the derived value and stays editable
- [ ] The chosen race's ability bonuses are visible at the ability inputs — advisory or
      applied-on-tap, but never silently applied
- [ ] Standard array is one tap; hand-typed scores keep working unvalidated
- [ ] A new character can accept their class's starting equipment without hand-picking
      each item
- [ ] CI green

## Prompt

Jamie has picked a direction in the Decision section of
`.icm/intake/DND-060-creation-form-value-pass.md` — read it, and `.icm/project.md` for
context. If killed, `git mv` to `_done/` with a `> Dropped:` line and stop. If the
wizard was chosen, do not build it from this ticket — cut a fresh ticket with its own
design and move this one to `_done/` pointing at it.

For the incremental scope: the form is `src/components/characters/character-form.tsx`
with validation in `src/lib/characters/schema.ts`; the derivation rules are in
`docs/rules/03-character-creation.md`; race `ability_bonuses` and class
`starting_equipment` come from the existing reference proxy. Everything stays advisory —
the form must keep accepting a hand-built character exactly as it does today (D6).
Starting equipment maps to the inventory via the same item shapes the picker in
`inventory-card.tsx` writes. Open a PR on a `claude/` branch; CI is the source of truth.
