# DND-054 · Encounter difficulty — the XP-budget math, live while building

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | feature |
| Priority | P2 |
| Size | S–M |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `src/components/encounters/add-combatants-sheet.tsx` · `docs/rules/10-dm-guide.md` |

## Problem

The encounter builder lets a DM stack twenty goblins against the party and offers no
opinion on whether that's a warm-up or a TPK. The 5e encounter math — per-character XP
thresholds by level, monster XP summed, the count multiplier, compared against
easy/medium/hard/deadly — is fiddly enough that DMs use web calculators for it, and
every input the calculation needs is already in this app: party levels sit on the
campaign roster, each monster's XP and CR are in the reference data, and the encounter
knows exactly which monsters it holds. The tables themselves are already written down in
`docs/rules/10-dm-guide.md`.

`grep -i difficulty` over `src/` returns nothing today; monster `xp` is rendered in the
reference detail view and used nowhere.

Counterpoint worth weighing: this is a *prep* tool for one DM, not table-time state for
players — and CR math is famously loose guidance anyway. It helps most before the
session, which is not the phone-first moment the app optimises for.

## Decision — Jamie

- [ ] **Build it, in the add-monsters flow.** A live line in the add-combatants sheet
      and the tracker header: adjusted XP vs the party's four thresholds, with the
      verdict ("Hard, 1,100 / deadly at 1,400"). No new screens. Size S–M.
- [ ] **Verdict only.** Skip the running numbers; just the easy/medium/hard/deadly word
      on the encounter. Smallest version.
- [ ] **Kill.** Jamie eyeballs encounters or uses an external calculator during prep.
      `> Dropped:` and done.

## Acceptance

- [ ] Building an encounter shows adjusted XP against the current party's thresholds,
      updating as monsters are added and removed
- [ ] The multiplier for monster count is applied per SRD 5.1
      (`docs/rules/10-dm-guide.md`), and characters without levels don't crash the math
- [ ] Purely advisory — nothing blocks an over-budget encounter
- [ ] CI green

## Prompt

Jamie has decided in `.icm/intake/DND-054-encounter-difficulty-budget.md` — read its
Decision section and `.icm/project.md` for context. If killed, `git mv` to `_done/` with
a `> Dropped:` line and stop.

The threshold and multiplier tables are in `docs/rules/10-dm-guide.md` — implement them
as a pure function in `src/lib/encounters/` with unit tests against that file's numbers.
Party levels come from the campaign roster (the same query feeding
`party-glance.tsx`); monster XP comes from the reference payloads already fetched by the
add-combatants sheet (`src/components/encounters/add-combatants-sheet.tsx`) — check
whether the *list* payload carries XP or only the detail payload, and say in the PR what
that cost. Open a PR on a `claude/` branch; CI is the source of truth.
