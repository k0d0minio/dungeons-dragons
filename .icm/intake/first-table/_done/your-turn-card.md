# Stub: The turn, at the top of the sheet

- feature-slug: your-turn-card
- sequence: 8 of 17
- depends-on: creation-readiness
- priority: P2
- size: M
- sources: `.icm/docs/2026-09-05-first-timer-research.md` §1 (Ginny Di's per-character
  cheat sheet; TheGamer's spoken formula; Dump Stat's "four stages… you only need the
  first two"), §6 (attacks and slots in the first viewport); Q&A: pin it at the top of
  Play

The one artefact every source wants, and it is per-character, not generic: **Move**
(the speed); the **attack** written the way the DM says it — "roll d20 + 5; hits AC;
then 1d8 + 3 slashing" — for each readied weapon; the character's **one bonus action**
where a level-1 feature or a prepared spell grants one (Healing Word, Cunning Action —
from the class features and spells the data layer already has); the **one reaction**
(Opportunity Attack for everyone; Shield or Hellish Rebuke where prepared); and
"**cantrips**: always · **slots left**: 2".

Every number from the rules engine — `weaponAttack`, `spellSaveDc`, the walkthrough
module in `src/lib/characters/walkthrough.ts`, whose tests already hold each breakdown
to the engine's own answer — so this card renders the walkthrough's rows as a sentence
and never computes one. Tapping a line opens the existing walkthrough sheet.

Pinned first on Play; hit points directly under it. Gates apply: no slot line for a
character without slots, the mastery word only when that gate is on. D8 holds —
nothing rolls.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/your-turn-card.md` and the epic's `breakdown.md`. Build it on a
`claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the stub
into `.icm/intake/first-table/_done/` in the same PR.
