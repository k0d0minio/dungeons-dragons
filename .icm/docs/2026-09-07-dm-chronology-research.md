# DM chronology — mobile navigation research, 2026-09-07

> Evidence behind the `dm-chronology` epic. Jamie's ask (2026-09-07): the DM side is one
> long list of cards; organise it by how a game is actually run, on a phone, for a DM who
> is learning. Mockup: <https://claude.ai/code/artifact/3c32ab1b-7e8e-42ca-88cd-c9d8cd92bd7e>.

## What was found in the app

`/dm` is a campaign list and three cards. `/dm/campaigns/[id]` stacks thirteen cards in
one scroll (party glance, milestone, encounters, session zero, four prep links, session
log, feature gates, notes, join code, close campaign). Every deep page's only exit is Back
to that hub. "Session" is three unlinked things: a dated session plan (prep), the derived
session log (everything stamped since the last close), and campaign notes with a session
date, one of which becomes the recap. Nothing ties a plan to the night it ran or to its
recap. Two register decisions fence any change: D16/D44 (the bar never changes shape; the
DM's is Library · DM) and D39 (Apple HIG structure, phones only).

## The numbers that bind

- **Tab bar.** Apple HIG: three to five tabs on iPhone; a More tab is "a poor use of
  space". Material 3: 3–5 destinations of equal importance; never a drawer as primary
  phone nav. Tabs are areas, never actions, and the bar stays persistent (WWDC22
  "Explore navigation design for iOS").
  <https://developer.apple.com/design/human-interface-guidelines/tab-bars> ·
  <https://m3.material.io/components/navigation-bar/guidelines> ·
  <https://developer.apple.com/videos/play/wwdc2022/10001/>
- **Segmented control.** Five or fewer segments; sibling views only, never actions.
  <https://developer.apple.com/design/human-interface-guidelines/segmented-controls>
- **Disclosure depth.** NN/g: what is used often sits on the first level; beyond two
  levels usability drops. Under ~6 sub-items → inline/accordion; 6–15 → a section list.
  <https://www.nngroup.com/articles/progressive-disclosure/> ·
  <https://www.nngroup.com/articles/mobile-subnavigation/>
- **Thumb zone.** ~49% of use is one-handed, 75% thumb-driven; bottom-centre is the easy
  zone, top corners the hard one.
  <https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/>
- **Lists beat cards** for scanning because element positions are fixed; cards
  de-emphasise order. Material: lists for homogeneous content, ≤3 lines per row.
  <https://www.nngroup.com/articles/cards-component/> ·
  <https://m3.material.io/components/lists/guidelines>
- **Onboarding.** Tutorials interrupt and are not remembered; contextual help, teaching
  empty states with one call to action, and wizards only for genuinely ordered setup.
  <https://www.nngroup.com/articles/onboarding-tutorials/> ·
  <https://www.nngroup.com/articles/empty-state-interface-design/>

## What the DM-tool ecosystem converges on

- **Campaign → Session → Encounter** everywhere (D&D Beyond, Encounter+, Shieldmaiden,
  World Anvil, Kanka, Obsidian vaults).
- **Prep / Play / Recap** as the phases. Sly Flourish's eight steps are prep (review the
  characters, strong start, scenes, secrets and clues, locations, NPCs, monsters,
  treasure) and are consumed differently at the table: strong start first, scenes for
  "where next", secrets to drop in. Play opens with a player-led recap, then the strong
  start. <https://slyflourish.com/eight_steps_2023.html> ·
  <https://slyflourish.com/using_the_8_steps_at_the_table.html> ·
  <https://slyflourish.com/starting_strong.html>
- **One tap away during play:** initiative, HP and conditions, stat blocks, party AC and
  passives, a rules crib, and a player-facing shared view.
  <https://help.encounter.plus/encounter-management> ·
  <https://shieldmaiden.app/tools/dm-screen>
- Session reports/journals are the "after" noun; Session Zero the "before" one.

## Patterns adopted, and the trade-off of each

1. **Chronology as the tab bar** (Prep · Play · Sessions · Library), the campaign as
   scope rather than a tab. Cost: things that span phases (notes, the party) need one home
   and cross-links, never two tabs.
2. **"Up next" hero row** above the lists (Calendar's Today, Things' Upcoming) for the
   next session and the fight in progress. Cost: needs a real "next session" rule.
3. **Inset grouped lists with disclosure rows and value rows** instead of cards, one
   section header per phase.
4. **A date-grouped timeline with sticky headers** for the nights, oldest at the bottom.
5. **Checklist rows with a progress rail** for the eight steps.
6. **A bottom toolbar for the play screen's actions**, not a FAB; bottom sheets for quick
   edits so the party stays in view.
7. **Progressive exposure through empty states and the existing gates**, no wizard.
8. **Play as a normal tab**, the tracker one tap in, rather than a mode that hides the
   bar — a beginner who loses the bar mid-session is lost (Jamie, 2026-09-07).

## Jamie's answers, 2026-09-07

Four-stop bar for the DM only (1a) · names Prep · Play · Sessions (2) · one campaign
open at a time (3) · a real plan → recap link, one nullable column (4b) · Play is a
normal tab (5) · the Lazy DM eight steps as the prep rail (6) · every note belongs to a
night (7) · the batch lands from session 2 on — nothing ships before tonight (8) ·
mockup first, then stubs (9) · one link that both makes the account and seats the person
at the campaign (10).
