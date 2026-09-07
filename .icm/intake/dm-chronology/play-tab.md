# Stub: The Play tab — what is open on the phone at the table

- feature-slug: play-tab
- sequence: 4 of 9
- depends-on: dm-tab-bar
- priority: P1
- size: L
- sources: breakdown.md; mockup artboard "Play tab" and its note; research doc "one tap
  away during play"

The screen a DM has open with players either side of him. Its order is the order a hand
reaches for things mid-session: the fight, the party, tonight's plan, reveal. Four
actions sit in a bottom toolbar above the bar. Nothing on it changes what six phones
show except the reveal switches, which is their job.

## Build

- **The fight**: the encounter with `completed_at null` first, as a row — name, "Round n ·
  <whose> turn", "Open tracker" — then "Start a fight" listing encounters built and not
  yet fought, linking to the builder. Two open fights are two rows.
- **The party**: `PartyGlance`'s rows, made compact — name, class and level, who plays
  it, HP bar and numbers, AC, passive Perception, conditions on their own line only when
  present. Same 15 s poll, same link to the profile page. Under it one value row,
  Milestone "Level n · k of m have taken it", opening the milestone control in a bottom
  sheet.
- **Tonight's plan**: `tonightsPlan(campaign)` — the plan whose `session_date` is today,
  else the next dated plan, else the newest undated. Derived only: "make this tonight's
  plan" sets its date to today, no column. The strong start printed in full (it is heard,
  never read out — the SecretLayer marking stays), then scenes and secrets as one-tap
  tick rows (the mid-session shape `session-plans` established). A campaign with no plan
  shows one line and a link to Prep.
- **Reveal**: one row — "3 NPCs, 1 place and 2 handouts still hidden" — opening the
  reveal switches in a bottom sheet listing the hidden entities, so revealing an NPC as
  the party meets him is two taps, not a walk to the roster.
- **Bottom toolbar** (HIG toolbar, 52 px, above the bar): Quick note (the `QuickNoteForm`
  in a sheet, landing in tonight's open note), Crib (`/dm/crib`), Reveal (the sheet
  above), Table screen (the open fight's `/table/<token>` — copy link, and a line saying
  which fight; with no open fight it says so).
- `app-shell.tsx` gains the clearance for a page that carries the toolbar; the token is
  `--bottom-nav-height`, extended, not a second number.

## Done looks like

Tests for the section order, `tonightsPlan` (today / upcoming / undated / none), the
toolbar's four actions and the no-fight state, and that no DM-only column reaches the
client except through the existing SecretLayer components.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-chronology/play-tab.md` and the epic's `breakdown.md`. Build it on a
`claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the stub
into `.icm/intake/dm-chronology/_done/` in the same PR.
