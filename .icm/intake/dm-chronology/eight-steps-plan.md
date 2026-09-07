# Stub: One night's prep is the Lazy DM's eight steps

- feature-slug: eight-steps-plan
- sequence: 3 of 9
- depends-on: prep-tab
- priority: P1
- size: M
- sources: breakdown.md; mockup artboard "One night's prep"; Sly Flourish, *Return of the
  Lazy Dungeon Master* — the eight steps (research doc)

A session plan today is five sections and two checklists on one screen. It becomes a
numbered rail of the eight steps, in the Lazy DM's order, each row saying whether it is
done — so a DM who has never prepped a session is told what to write and in what order,
by the book he is learning from. No new entity: every step maps onto what the plan
already stores.

## Build

- The plan page (`src/app/dm/campaigns/[id]/session-plans/[planId]/page.tsx`) leads with
  a progress rail and one inset group of eight rows:
  1. **Review the characters** → the party profiles (`/dm/campaigns/[id]/party`); status
     "5 characters · 1 not ready".
  2. **A strong start** → `strong_start`; "Written · n lines" / "Empty".
  3. **Potential scenes** → the `scene` items; "4 scenes".
  4. **Secrets and clues** → the `secret` items; "7 written · aim for about 10".
  5. **Fantastic locations** → linked locations; names, or "None linked".
  6. **Important NPCs** → linked NPCs; names, or "None linked".
  7. **Monsters** → linked encounters; "Nothing built yet — open the encounter builder"
     links to `/dm/campaigns/[id]/encounters/new`.
  8. **Treasure** → `treasure`.
  A step with nothing in it prints its label in the primary colour: it is the next thing
  to do. Tapping a row opens that step's editor — the existing field editors, checklists
  and pickers, each on its own screen or bottom sheet rather than all at once.
- **Readiness** is one pure function, `planReadiness(plan)` in
  `src/lib/session-plans/`, returning the eight statuses and the count; `prep-tab`'s
  hero and `sessions-tab`'s rows read the same function.
- The footer line says the rule in words: on the night, Play shows this plan's strong
  start, scenes and secrets, and you tick them there.
- **Announce** keeps `reveal-controls`' switch for the public layer (title and date) as a
  value row; nothing else about revealing changes.
- Ticking, reordering, the "Arrange" toggle and the whole-list reorder write
  (`dm-prep-suite` amendments) are untouched.

## Done looks like

Tests for `planReadiness` on an empty plan, a full one and each partial; the eight rows
and their links; the encounter builder link carrying the plan so the fight it builds is
linked back (extend `session_plan_links` use, no new column).

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-chronology/eight-steps-plan.md` and the epic's `breakdown.md`. Build it
on a `claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the
stub into `.icm/intake/dm-chronology/_done/` in the same PR.
