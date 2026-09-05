# Stub: Copy that reads as an error to a level-1 beginner

- lane: tweak
- found-by: first-timer audit, 2026-09-05 (`.icm/docs/2026-09-05-first-timer-audit.md` §C, §E)
- priority: P2
- size: S

Five lines seen on production, each true and each wrong for the person reading it:

- The Me segment's origin card says **"Not recorded"** for Subclass, Weapon mastery and
  Feats on a level-1 sheet — three things the player apparently forgot. The honest words
  are "At level 3" (subclass), "None yet" (feats), and for mastery whatever
  `first-table/weapon-mastery-gate` leaves visible.
- The Gear segment's AC tile says **"11 · manual"** on an unarmoured character who typed
  nothing — the stored column was derived by the wizard. "Unarmoured" is the word.
- The Attacks card's footnote **"Assumes proficiency with equipped weapons."** is a rules
  caveat under the one list a beginner reads every turn; move it into the walkthrough's
  *add* step, where the proficiency line already is.
- The wizard's intro and the empty-characters card promise **"eight steps" / "Eight
  quick questions"**, and a Fighter walks "Step 1 of 7" (no spells step). Derive the
  count from `stepsFor(classIndex)` or say "seven or eight".
- The DM home counts **"9 members"** for the table the campaign page calls **"8
  players"** — one includes the DM's roster seat. Pick one word and count the same
  thing in both places.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/beginner-copy-pass.md`. Fix the five lines on a `claude/` branch and
open a PR; CI is the only evidence. `git mv` the stub into `.icm/intake/triage/_done/`
in the same PR.
