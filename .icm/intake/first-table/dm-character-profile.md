# Stub: The DM's page for each player character

- feature-slug: dm-character-profile
- sequence: 6 of 17
- depends-on: creation-readiness, glance-derived-ac
- priority: P1
- size: L
- sources: `.icm/docs/2026-09-05-first-timer-audit.md` §A, §B;
  `.icm/docs/2026-09-05-first-timer-research.md` §3 ("Step zero of prep is the
  characters"; "know their goddamn names"; a mini DM screen per character — player name,
  trained skills, passive scores; DMs editing sheets is the norm, with transparency);
  Jamie, 2026-09-05: "see, edit and annotate player characters in a profile view"; Q&A:
  its own DM page; the DM fixes the seven from it; the DM can grant Inspiration

`/dm/campaigns/[id]/party/[characterId]`, scoped by the same two arms `getCampaignRoster`
uses — the campaign is the DM's (`campaigns.dm_user_id`) and the character is on its
roster; anything else 404s. The glance's rows open it; the live sheet is one tap
further. Nothing on this page is selected by a player-facing query.

## What it shows, top to bottom

1. **Who.** The character's name, "played by <account name>" (`neon_auth.user.name`,
   the read `listUsers` in `src/lib/db/users.ts` already makes), level · species ·
   class · background, the portrait if any. Today the DM has to match "Wobbles
   Wobbleton II" to a friend from memory.
2. **Readiness.** The checklist for the tutorial night — each line a fact, and where it
   is wrong a one-tap fix that calls `creation-readiness`'s functions: a weapon is
   readied (fix: ready the kit's weapon); spell slots exist for a caster (fix: the
   standard table); masteries chosen (fix: from the kit — shown even while the gate is
   off, so the choice exists before the gate opens); skills chosen (no fix — a link to
   Edit). A fix is a PATCH through the existing character routes with the version
   guard; a fix that touches items and the row is two requests, **items first** — a
   character with a weapon readied and no slots is a better partial state than the
   reverse, and pressing the fix again finishes it.
3. **Vitals, as the sheet computes them.** HP, derived AC, passive Perception,
   initiative, speed; the attack lines; spells prepared and slots; trained skills.
   Read-only — the Lazy DM's "small DM screen".
4. **Heroic Inspiration.** A *Grant* control, writing the flag through the same
   combat-state path the sheet uses; the player spends it on their sheet.
5. **Links.** Open sheet (live editing, D13), Edit, Manage level.
6. **The DM's note** — `dm-character-notes` lands here next; leave the slot.

## Not here

Retiring the character (`retire-a-character`); the note (next stub); any attribution of
the DM's edits — D25 stands, and this is the place to revisit it if a player ever asks
"who changed my hit points".

## Done looks like

Tests for the two-arm scope (another DM's campaign, a character not on the roster);
every readiness line against a fixture character in each state; the fixes calling the
shared functions rather than re-deriving; "played by" rendered from the auth user; the
glance row's link.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/dm-character-profile.md`, the epic's `breakdown.md`, and the
`_done/` stubs for `creation-readiness` and `glance-derived-ac` (the functions and the
roster read this page reuses). Build it on a `claude/` branch and open a PR; CI is the
only evidence. When it ships, `git mv` the stub into `.icm/intake/first-table/_done/`
in the same PR.
