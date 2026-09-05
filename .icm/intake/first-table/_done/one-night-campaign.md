# Stub: A campaign that ends tonight, and the table that carries on

- feature-slug: one-night-campaign
- sequence: 11 of 17
- depends-on: none
- priority: P2
- size: M
- sources: Jamie, 2026-09-05: "the tutorial campaign is our 0. We're aiming to have it
  be a campaign that starts and ends in 1 night."; `.icm/docs/2026-09-05-first-timer-research.md`
  §2, §4 (session zero → a short adventure → the real campaign; the box runs in 30–90
  minute scenes)

The app has no notion of a campaign ending. After Thursday the Tutorial is over and the
real campaign starts with the same nine seats — today that means a new campaign, a new
join link sent round, and everyone joining again.

## Build

- **Close this campaign** on the DM's campaign page: a nullable `closed_at` (additive)
  that publishes the recap the session log already drafts, and hides the campaign from
  the players' sheets except for that recap.
- **Carry the table forward** on the new-campaign form: a checkbox that seats every
  member and attaches every character of the campaign being closed, in one ordered pass
  — members first, then characters, each insert idempotent on its primary key, so a
  re-run finishes what a failure left (`neon-http` has no transactions).

## Decision left open — Jamie

Whether the tutorial characters *are* the real campaign's characters, or everyone
remakes. If remake: carry-forward seats the members only, and every player's front door
is the wizard.

> Decided (Jamie, 2026-09-05): **carry the characters** — the checkbox seats every member
> and attaches every character of the campaign being closed. A character that should not
> continue is retired one at a time from its profile page.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/one-night-campaign.md` and the epic's `breakdown.md`. Check the
open decision on the stub has an answer before building. Build it on a `claude/` branch
and open a PR; CI is the only evidence. When it ships, `git mv` the stub into
`.icm/intake/first-table/_done/` in the same PR.
