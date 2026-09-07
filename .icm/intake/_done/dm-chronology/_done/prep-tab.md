# Stub: The Prep tab — the next night on top, the world beneath it

- feature-slug: prep-tab
- sequence: 2 of 9
- depends-on: dm-tab-bar
- priority: P1
- size: M
- sources: breakdown.md; mockup artboard "Prep tab"

Prep is a different visit from running the table (the `dm-prep-suite` decision that put
prep on its own pages). This tab is that visit's front door: what to write next, and the
doors to everything already written.

## Build

- **Up-next hero row**: the next session's plan — the plan with the earliest
  `session_date` on or after today, else the newest undated one. Eyebrow "Next session ·
  <date>", the title, an eight-segment progress rail, and "<n> of 8 steps ready · still
  to do: …" — the readiness `eight-steps-plan` defines; until that stub ships, count the
  five fields the plan has today. Tapping opens the plan. With no plan, the hero is the
  teaching empty state: what a plan is, one button that makes one.
- **Nights**: one row, "Plan another night" — the title-and-date form
  `SessionPlanRoster` already has, in a bottom sheet. Played and closed nights are not
  listed here; a footer line says they live under Sessions.
- **The world**: one inset group, one row per prep entity with a value on the right —
  NPCs "12 · 4 revealed", Places, Handouts, Encounters "2 ready" (encounters with
  `completed_at null`), and The party "5 · 1 not ready" (the `readiness-card` count,
  bloodied-coloured when non-zero). Rows link to the existing pages.
- **Before the campaign**: Session zero one-pager, value "Written" or "Empty", linking to
  the existing card's editor.
- Counts come from one data function per entity family, DM-scoped through `runByDm`;
  none of them selects a DM-only column.

## Done looks like

Tests for the next-plan rule (dated future, undated, none), the counts, and the empty
states. The old Prep card on the campaign hub is left in place until `retire-the-hub`.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-chronology/prep-tab.md` and the epic's `breakdown.md`. Build it on a
`claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the stub
into `.icm/intake/dm-chronology/_done/` in the same PR.
