# Stub: Weapon Mastery waits behind a gate

- feature-slug: weapon-mastery-gate
- sequence: 5 of 17
- depends-on: creation-readiness
- priority: P1
- size: S
- sources: `.icm/docs/2026-09-05-first-timer-research.md` §5 (the starter box's class
  boards omit mastery; "Maybe move it to level 2?"; "another decision point, more
  tactics, more rolls — are flaws not features" for learners); Q&A: gate it, pre-pick
  silently

A sixth key in `GATE_KEYS` (`src/lib/campaigns/gates.ts`): `weaponMastery`, off by
default, with its `adds` / `whileOff` lines in the descriptor table — "Each weapon's
mastery property — Sap, Vex, Topple — shows on the attack row, and players choose which
weapons they have mastered." / "Attacks carry no mastery line. The weapons chosen for
them stay chosen." Off hides the mastery line on the attack rows (`attacks-card.tsx`),
the Weapon mastery row on the Me segment's origin card, the picker on the edit form
(`weapon-mastery-picker.tsx` via `character-form.tsx`) and the walkthrough's mention.
`creation-readiness` has already chosen the masteries, so switching the gate on reveals
a finished choice rather than an empty one.

Rails: a gate hides UI and never deletes state (D40); no migration — the column is
jsonb and an absent key is off; `ALL_GATES_ON` still shows mastery to a character
outside any campaign; the descriptor test that holds every key to a line covers the new
one; the settings screen lists it with the other five.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/weapon-mastery-gate.md` and the epic's `breakdown.md`. Build it
on a `claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv`
the stub into `.icm/intake/first-table/_done/` in the same PR.
