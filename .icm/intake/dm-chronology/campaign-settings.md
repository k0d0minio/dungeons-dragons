# Stub: Campaign settings — the between-sessions controls, off the play screen

- feature-slug: campaign-settings
- sequence: 7 of 9
- depends-on: dm-tab-bar
- priority: P1
- size: M
- sources: breakdown.md; mockup artboard "Campaign settings"

Join link, feature gates, milestone, session zero, the roster and close-campaign are
between-sessions decisions sitting on the page a DM opens mid-fight. They move to one
grouped settings page reached from the campaign chip, in the Settings-app idiom: label
left, current state right, a chevron into the control.

## Build

- `/dm/campaign` (the active campaign; `?id=` for a closed one from Sessions), back link
  to the tab it was opened from.
- **Campaign**: Name (editable — the first place it ever is), Session zero one-pager
  ("Written"/"Empty"), Milestone ("Level n"), Player features ("3 of 6 on") — each into
  its existing control (`SessionZeroCard`, `CampaignMilestoneCard`, `CampaignGatesForm`)
  presented as a bottom sheet or its own screen, not all inline.
- **Players**: one row per member — the account's name, the character and class
  beneath — into the DM's profile page for that character; "Invite someone" (the row
  `one-link-invite` makes real; until then it links to `/dm/users`); "Join link for
  existing accounts" with Copy and Regenerate (`JoinCodeCard`'s two actions).
- **Accounts**: one row into `/dm/users`.
- **The end**: Close the campaign, destructive-coloured, last, with `CloseCampaignCard`'s
  confirm and recap draft behind it. A closed campaign shows "Closed <date>" here and no
  join link (a closed campaign answers no join code).
- No new API; every control posts to the route it posts to today.

## Done looks like

Tests for the value rows' states, the closed-campaign shape, and that every control
reaches the same route it did on the hub.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-chronology/campaign-settings.md` and the epic's `breakdown.md`. Build it
on a `claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the
stub into `.icm/intake/dm-chronology/_done/` in the same PR.
