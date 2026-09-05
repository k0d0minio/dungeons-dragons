# Stub: Announce the night

- feature-slug: announce-the-night
- sequence: 9 of 17
- depends-on: none
- priority: P2
- size: M
- sources: `.icm/docs/2026-09-05-first-timer-audit.md` §A.5; Q&A: yes

`campaign_session_plans` already has a public layer (`SESSION_PLAN_PUBLIC_FIELDS` in
`src/lib/session-plans/schema.ts` — the date; `PublicSessionPlan` in
`src/lib/db/session-plans.ts`) and a `revealed_at`, and nothing writes it: the plan page
says "Not announced" and means it. On 2026-09-05 the only place Thursday's date existed
was the DM's screen.

## Build

The act: a reveal switch on the plan page (`reveal-switch.tsx`, a
`PUT …/session-plans/[planId]/reveal` with body `{revealed}` — the shape every other
revealable uses; un-announcing is the same switch). The surface: the next announced
night at the top of the player campaign view ("Thursday 10 September — Session 1 -
Intro") and one line on the sheet's campaign card. Title and date only —
`listAnnouncedPlans` selects the public columns and nothing else, so a strong start,
scenes and secrets never leave the DM (D38). It rides the 15 s player rail like every
other reveal.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/announce-the-night.md` and the epic's `breakdown.md`. Build it
on a `claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv`
the stub into `.icm/intake/first-table/_done/` in the same PR.
