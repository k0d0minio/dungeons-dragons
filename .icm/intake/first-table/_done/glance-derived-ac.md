# Stub: The party glance prints the AC the sheet prints

- feature-slug: glance-derived-ac
- sequence: 2 of 17
- depends-on: none
- priority: P1
- size: S
- sources: `.icm/docs/2026-09-05-first-timer-audit.md` §A.3

The glance (`src/components/campaigns/party-glance.tsx`, the AC cell) and the list card
(`src/app/characters/page.tsx`, `StatRow`) print `character.armorClass` — the stored
column, which is the *unarmoured* number and which the sheet only uses when no body
armour is equipped (`derivedArmorClass`, `src/lib/characters/attacks.ts`). On production,
2026-09-05: Ava's sheet says AC 18 (gear + shield), the glance says 10. Melnur 16 vs 11.
LochDeen 12 vs 10. The number the DM reads to decide whether a goblin hits is wrong for
every armoured character on the roster.

## Build

`getCampaignRoster` (`src/lib/db/campaigns.ts`) and the `/api/campaigns/[id]` read the
glance polls carry each character's equipped armour-category items — one query over
`character_items` for the roster's ids with `equipped = true`, filtered to armour on the
way out — and the glance computes AC through the same `derivedArmorClass` the sheet
uses. The same function, never a second formula; the same on `/characters`. Nothing is
stored: the register's "nothing derived is stored" holds, and a shield the DM equips from
the sheet shows on the glance within a poll.

The table screen (`getEncounterByShareToken`) prints no AC (D24) — leave it.

## Done looks like

The roster read returns each character's equipped armour; the glance renders 18 for a
chain-mail-and-shield character whose column says 10; a character with nothing equipped
still shows the column; the list card agrees with the sheet.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/glance-derived-ac.md` and the epic's `breakdown.md`. Build it
on a `claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv`
the stub into `.icm/intake/first-table/_done/` in the same PR.
