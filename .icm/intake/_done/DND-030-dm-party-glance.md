# DND-030 · DM party glance — every character's vitals on one screen

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | S |
| Sources | market lens · `src/app/characters/page.tsx` · register D12, D14 |

## Problem

The single most persistent unshipped request against D&D Beyond is one screen showing every
party member's HP, AC and passive scores. DMs currently open each sheet individually; a Chrome
extension exists solely to add it. The market lens surfaced four separate forum threads asking
for it over several years.

Jamie is building the campaign relationship anyway (DND-026) and the read predicate anyway
(DND-027). This is the cheapest thing that relationship can deliver — pure read, no new schema,
no write path, no concurrency question — and it is the screen a DM actually looks at most
during a session.

It was not on the original DM list, which named encounter tracking, monster stat blocks,
campaign notes and the rules playbook. It is being added because the prior art is unusually
clear on it and the cost here is unusually low.

Passive Perception specifically: it is `10 + Wisdom modifier (+ proficiency if proficient in
Perception)`, and a DM checks it constantly to decide who notices something. Proficiency is
DND-015's territory, so until that lands the passive score is computable only without the
proficiency term — say so on screen rather than showing a number that might be wrong.

## Acceptance

- [ ] A DM sees every character in a campaign they run on one screen
- [ ] Each row shows at minimum current/max HP, temp HP, AC and passive Perception
- [ ] Conditions currently on each character are visible without tapping through
- [ ] A row taps through to the full sheet
- [ ] It is read-only — no editing from this screen
- [ ] A player cannot reach it for a campaign they are not the DM of
- [ ] Where a value cannot yet be computed correctly (passive Perception without proficiency
      data), the screen says so rather than showing a possibly-wrong number
- [ ] CI green

## Prompt

Build the DM's party glance screen for the D&D 5e Companion: every character in a campaign,
their vitals, on one screen.

**Depends on DND-026** (campaigns) and **DND-027** (the viewer predicate that lets a DM read
other people's characters). Do not start until both have landed — this ticket adds no new
access rule of its own, it consumes DND-027's.

The case for it: this is the longest-standing unshipped feature request against D&D Beyond,
and it is what a DM actually stares at during a session — who is hurt, who is about to go down,
who notices the ambush. Because DND-026 and DND-027 exist, it is pure read with no new schema
and no write path.

Each row wants current/max HP, temp HP, AC, passive Perception, and any conditions currently
applied. `src/app/characters/page.tsx` is the closest existing thing — an owner-scoped list —
and `src/lib/characters/` already holds the derivation helpers for modifiers and derived
values. Rows tap through to the full sheet.

**Keep it read-only.** The DM's ability to edit is DND-027 plus DND-028, exercised on the sheet
itself. A glance screen that also edits is where the concurrency risk actually bites, and it is
not needed for the screen to do its job.

One correctness trap: passive Perception is `10 + WIS modifier`, plus proficiency bonus if the
character is proficient in Perception — and which skills a character is proficient in is not
stored yet (that is DND-015). Do not silently show a number that is wrong for half the party.
Either show it with an explicit caveat, or land DND-015 first and compute it properly; say
which you did.

It needs a home in the bottom tab bar from DND-029. If that has not landed, put it on a route
and note the dependency rather than building navigation here.

Read `.icm/intake/DND-030-dm-party-glance.md` and `.icm/project.md` for context. Open a PR on a
`claude/` branch; do not run local checks — CI is the source of truth.
