# Stub: ASI and feat grants in the level planner

- feature-slug: asi-and-feats
- sequence: 5 of 6
- depends-on: rules-engine-2024
- priority: P2
- size: M
- sources: purged DND-061 (recoverable at `git show 345d7c2^:.icm/intake/DND-061-subclasses-and-asi.md`); ticket-scout 2026-08-29

The purged DND-061's lost half: at levels 4, 8, 12, 16, 19 the 2024 rules grant an
Ability Score Improvement **or** a feat, and the level-up planner currently prompts
nothing — scores silently drift wrong. The starter box ends at level 3, so level 4
arrives right after the first campaign's finale. SRD 5.2.1 carries 16 feats; the
planner offers ASI as the recommended default (beginners) with the feat list behind
the advanced toggle, mirroring the wizard's pattern.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/srd-2024-migration/asi-and-feats.md` and the epic's `breakdown.md`. The
2024 rules engine (`rules-engine-2024`) is in place. Extend
`src/lib/characters/level-up.ts` and the level planner UI: at ASI levels, prompt for
+2/+1+1 ability increases (recommended default derived from class) or an SRD 5.2.1
feat behind an advanced toggle; persist the choice (additive nullable schema);
respect the 20 cap. Unit-test the grant levels per class and the cap. PR on a
`claude/` branch; CI green only.
