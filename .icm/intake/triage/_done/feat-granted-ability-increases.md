# Stub: feats that raise a score do not raise it

- lane: bug
- found-by: srd-2024-migration/asi-and-feats, 2026-09-02
- priority: P2
- size: S

Three of the feats the level planner offers carry an ability increase of their own:
Grappler ("+1 Strength or Dexterity"), and every Epic Boon ("+1 to one ability score,
to a maximum of 30"). Taking one of them at a feat level records the feat and leaves
the six score columns alone — the screen says so and points at the character form, but
a player who does not read that line ends up a point light, and nothing on the sheet
says which point is missing.

The shape is already there: `LevelFeat.increases` (`src/lib/db/schema.ts`) is stored
per entry whatever the feat, and `reconcileFeatChoices` in
`src/lib/characters/level-up.ts` applies and gives back whatever it holds. What is
missing is the prompt — which ability, offered only for a feat that grants one — and
the cap, which is **30** for an Epic Boon rather than the 20 an Ability Score
Improvement stops at. `src/lib/srd/data/feats.json` does not carry the increase as
data; it is a sentence inside `description`, so the grantable ones have to be named
somewhere rather than parsed.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/feat-granted-ability-increases.md`. The level planner
(`src/components/characters/level-up-feats.tsx`) offers SRD feats at Ability Score
Improvement levels but never applies the +1 that Grappler and the Epic Boons grant.
Prompt for the ability when the chosen feat grants one, store it in the existing
`LevelFeat.increases` ledger, and respect the right cap — 20 for an Ability Score
Improvement, 30 for an Epic Boon. Unit-test both caps. PR on a `claude/` branch; CI
green only.
