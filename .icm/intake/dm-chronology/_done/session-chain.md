# Stub: A night is one chain — the plan, what happened, the recap

- feature-slug: session-chain
- sequence: 5 of 9
- depends-on: none
- priority: P1
- size: M
- sources: breakdown.md; Jamie 2026-09-07, answer 4b; D41 (the recap is a shared note;
  the log is derived); `dm-run-suite/session-log-recap`

Nothing links a plan to the night it ran. The recap is a `campaign_notes` row with
`session_closed_at`; the log is everything stamped since the last close; the plan is a
row with a date. One nullable column joins them, and the log learns to read one night at
a time instead of only "since the last close".

## Build

- `campaign_notes.plan_id`, nullable, FK → `campaign_session_plans.id` `ON DELETE SET
  NULL`. One additive migration, no backfill, no default. A plan deleted after the night
  leaves the recap standing, unlinked.
- `POST /api/campaigns/[id]/session-log/close` stamps `plan_id` with tonight's plan —
  the `tonightsPlan` rule `play-tab` defines (build the pure function here if this stub
  lands first; it is the same function). The close dialog names the plan it will link
  and lets the DM pick another or none.
- `src/lib/db/session-log.ts`: `getSessionLog` keeps its meaning (the open window).
  Beside it, `getSessionLogWindow(dmUserId, campaignId, since, until)` returns the
  entries stamped in `(since, until]`, and `listNights(dmUserId, campaignId)` returns the
  timeline: every recap (closed note) as a played night carrying its window's entries,
  its plan (by `plan_id`), and the notes with that night's `session_date`; every plan
  with no recap as an upcoming night; the open window as "tonight" when it holds
  anything or a plan is dated today. Ordered newest first. Nothing here writes.
- Every statement folds `campaigns.dm_user_id` in through `runByDm`, and no statement
  selects a DM-only column — the log is what the recap draft is built from.

## Done looks like

Migration tests (additive guard), close stamping the link and honouring the DM's pick,
`listNights` with zero, one and three nights including a plan without a recap and a
recap without a plan, and the window arithmetic at the boundaries.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-chronology/session-chain.md` and the epic's `breakdown.md`. Build it on
a `claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the
stub into `.icm/intake/dm-chronology/_done/` in the same PR.
