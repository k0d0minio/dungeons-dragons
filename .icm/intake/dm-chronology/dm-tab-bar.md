# Stub: The DM's bar becomes Prep · Play · Sessions · Library

- feature-slug: dm-tab-bar
- sequence: 1 of 9
- depends-on: none
- priority: P1
- size: M
- sources: breakdown.md; the mockup's "bar" note; D48 (amends D16/D44 for the DM only)

Today the DM's bar is Library · DM and `/dm` is the campaign list. The bar for the `dm`
role becomes four stops — **Prep · Play · Sessions · Library** — and the campaign becomes
scope rather than a page: the tabs are id-less routes that resolve the active campaign
server-side. A player's bar (Character · Library) does not change by a pixel.

## Build

- `src/components/navigation/bottom-nav.tsx`: the DM's destinations are `/dm/prep`,
  `/dm/play`, `/dm/sessions` and Library, in that order (chronology, then reference).
  Icons in the existing lucide style. `isActive` by prefix: prep entities
  (`/dm/campaigns/[id]/{npcs,locations,handouts,session-plans,encounters/new}`) light
  Prep; `/dm/encounters/[id]`, `/dm/crib` and `/dm/campaigns/[id]/party` light Play;
  `/dm/campaigns/[id]/session-log` lights Sessions; the settings page and `/dm/users`
  light nothing, like the DM reading a party member's sheet today. Library keeps its
  overlay behaviour from every page but `/library`.
- **The active campaign** is one function, `getActiveCampaignForDm(userId)` in
  `src/lib/db/campaigns.ts`: the campaign with `closed_at null`; if the data ever holds
  more than one open, the most recently created, and a `dm_campaign` cookie set by the
  chip overrides it. Closed campaigns are never active — they are history in Sessions.
  With no open campaign every tab shows one teaching empty state with a single call to
  action: create the campaign (the existing `CreateCampaignForm`, carry-forward and all).
- **The campaign chip**: a pill under each tab's large title naming the active campaign,
  opening a menu with the other open campaigns (if any) and "Campaign settings" (the page
  `campaign-settings` builds; until then it links to `/dm/campaigns/[id]`). Build it once
  in `src/components/dm/`, server-rendered with the resolved campaign.
- The four routes exist after this stub, each with its `PageHeader`, the chip and the
  empty state; their real content arrives in stubs 2, 4, 6 and 7. `/dm` redirects to
  `/dm/play`, and `/` keeps sending the `dm` role to `/dm` (`first-table/dm-front-door`).
- `--bottom-nav-height` and the 64 px bar are untouched; four stops fit the thumb.
- Record D48 in `.icm/project.md`'s Decisions table if the planning commit has not.

## Done looks like

Tests for the bar's destinations per role, active-state per path, `/dm` → `/dm/play`,
`getActiveCampaignForDm` with none / one / several open campaigns and the cookie override,
and the player's bar unchanged.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-chronology/dm-tab-bar.md` and the epic's `breakdown.md`. Build it on a
`claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the stub
into `.icm/intake/dm-chronology/_done/` in the same PR.
