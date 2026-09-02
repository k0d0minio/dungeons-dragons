# D&D 5e Companion — project register

> Last `/project` run: 2026-08-29 · commit `fc1af5e`
> Maintained by `/project`. Amend by re-running it, not by hand-editing during a session.

## What this is

A mobile-first D&D companion for Jamie and the friends at his physical table. Two halves
of one job — reference lookup and a live character sheet — now aimed at a third: getting
5–6 friends who are brand-new to D&D through character creation, learning the game, and
their first campaign, which Jamie DMs from a published starter box with a session date
weeks away. Personal project, personal scale — one table, no customers, no revenue.

## Intent

- **For whom** — Jamie (the one `dm`) and 5–6 friends who have never played D&D. Players
  remain the primary user; until the first campaign has run, "player" means "beginner".
- **The job** — **teaching is the job until the campaign runs** (D33): get six beginners
  creating real characters and understanding what their choices do in play. Once a
  session is underway, the old hierarchy resumes: the sheet wins, and nothing may make
  it fiddlier. The ten-second lookup bar stands throughout.
- **Done looks like** — *v1 (2026-08-13, shipped, never played):* a friend signs in,
  creates a character, runs a session off the sheet, looks anything up in under ten
  seconds. *v2 (2026-08-15, shipped):* Jamie runs a session from behind the screen.
  *v3 (agreed 2026-08-29):* each friend builds a 2024-rules character through the guided
  wizard on their phone, learns the game from the app, and Jamie preps the starter-box
  campaign in the DM suite and runs session 1 — reveals, tracker, table screen — at the
  physical table.
- **Explicitly not** — a product (no customers, pricing, growth). Not a VTT, not a dice
  roller (D8), not a general-purpose campaign manager — it is a campaign *companion* for
  this one table (narrowed 2026-08-29). No multiclassing (D15).

## Business logic

- **Everything requires a session** (D34). The public half is retired. Named exceptions:
  the token table screen `/table/[token]` (D24 — the token is the credential), `/auth/*`,
  `/offline` (the service worker must cache it signed-out), and the reference *data*
  endpoints (public + CDN-cached: SRD content, no personal data — an implementation
  detail, not a surface).
- **A character belongs to its owner.** Owner-scoped queries; another user's character id
  404s rather than 403s. Preserved for players.
- **A DM sees and edits every character in a campaign they run**, including live combat
  state (D13). A player still sees only their own.
- **A character may belong to several campaigns** (join table, D14).
- **A DM's secrets never leave the DM.** Prep entities are revealable (D38): a public
  layer, a DM-only layer, and a `revealed_at` — player-facing queries select public
  columns only. Per-note visibility (D30) and private character notes stand.
- **Campaign content starts hidden; revealing is a deliberate DM act.** Revealed items
  persist in the players' discovered list and surface on the table screen.
- **Rules baseline is the 2024 rules — SRD 5.2.1** (D31). On screen the word is
  **species** (D32). Adventure text never enters app data; the DM's own prep notes
  reference the box he owns (D41).
- **Every rules lookup is answered from disk** as of `long-tail-reference-data`: 339
  spells, 331 monsters, 262 magic items and the 182-row equipment table ship in
  `src/lib/srd/data/` beside the creation sets, and no third party is in the request
  path. The split is bundle size, not trust — the creation-critical sets are imported
  straight into components, and only the long tail goes through the app's own public,
  CDN-cached `/api/srd/*` routes so a phone downloads a search result rather than a
  megabyte of stat blocks. The 2014 `/api/dnd5e/*` namespace is **retired whole**, per
  D31: a new path can never serve one player 2014 Fireball and the next 2024 Fireball
  from the same 8-day CDN window.
- **The derived-stat engine is on the 2024 mechanics** as of `rules-engine-2024`:
  every class takes its subclass at **level 3**; **Exhaustion** is a flat −2 to every
  D20 Test and −5 ft of Speed per level, folded into the saves, skills, initiative,
  passive Perception and attack bonuses the sheet prints; **weapon mastery** is
  surfaced per equipped weapon, named even for a class that cannot use it; half
  casters (paladin, ranger) cast from **level 1**; and **"spells known" is gone** —
  every caster prepares, from a count the class table fixes by level rather than from
  an ability modifier, with the wizard's spellbook the only list still picked at
  creation and level-up. The tables the SRD publishes only in the class Features
  tables are transcribed locally in `src/lib/characters/rules.ts` — upstream's
  `/api/2024/classes/{index}/levels` is a 404, so there is nothing to proxy.
- **A character records its 2024 origin** as of `character-model-migration`: the
  background it came from and how that background's +2/+1 was spent, the Origin feat,
  the subclass taken at 3rd level, the weapons it has Weapon Mastery with, and whether
  it is holding Heroic Inspiration. All seven columns are nullable — the production
  migrate job runs in parallel with the Vercel deploy, so every schema change is
  additive and nullable and nothing has a `NOT NULL` window. The six ability score
  columns keep holding the character's *final* scores as entered, so a background's
  increases are recorded rather than re-applied; the flow that starts from base scores
  is `guided-creation`. The 2014 prototype characters are deleted outright (D42) — no
  legacy mode, no conversion, no backfill — by one-off SQL Jamie runs against
  production, not by the migration, which would otherwise fire on every fresh
  environment.
- **A level-up asks what the level gives** as of `asi-and-feats`: at 4th, 8th, 12th,
  16th and 19th — plus 6th and 14th for a Fighter and 10th for a Rogue — the level
  planner prompts for the Ability Score Improvement, pre-filled from the class's primary
  ability (+2 to it, or +1 to each of two for a class the SRD names two for), with the
  SRD's General feats and, at 19th, the Epic Boons behind an advanced toggle. Nothing
  passes **20**. In the 2024 rules the improvement *is* a feat, so both branches store as
  one `feat_choices` entry per level — the feat's index and the points it actually added
  — in a nullable jsonb column, additive like the rest of the 2024 build. That ledger is
  what makes levelling *down* exact where hit points can only be approximated: the
  increase that was applied is on record, so it is the increase that comes back off, and
  a character with no ledger (every row written before this) has nothing taken away. All
  seventeen SRD feats now ship in `src/lib/srd/data/feats.json`; Origin feats are the
  same four a background grants, and Fighting Style feats are a class feature's to give,
  so neither is ever offered at a feat level.
- **A first character is made in a wizard, not a form** as of `wizard-frame`:
  `/characters/new` is eight steps — class, species, background, ability scores, skills,
  starting gear, spells, name — **mechanics before flavour**, with the recommendation
  pre-selected on every one and "use every suggestion" jumping straight to the name.
  Level 1 only; the one-page form stays as `/characters/[id]/edit`, which is where a
  build copied off paper belongs. The wizard is the one place scores are entered as a
  *base*, so `abilityScoresWithBackground` finally has its call site and a background's
  +2/+1 is applied exactly once; hit points, speed and the unarmoured armour class are
  derived rather than typed, and the starting kit lands in the inventory with armour
  already worn, so the sheet's own derived AC is right the first time it opens. The
  draft lives in `localStorage`, not in a row — an unfinished character is not a
  character, and a row for one would surface in every owner-scoped query in the app.
  **The join → create → attach loop is closed** (D36): a wizard started from a campaign
  join, or by a member of exactly one campaign, attaches the finished character to that
  campaign, and a player who joins with no characters is taken into the wizard rather
  than to an empty list. `POST /api/characters` grew four optional creation-only fields
  for it; membership and the equipment clause are both re-derived server-side, so the
  campaign id in a body is a pointer and never a permission.
- **The party levels by milestone** (D35). XP bookkeeping retires behind an off-default
  gate.
- **Feature gates per campaign, defaults off** (D40) — gates hide UI, never delete
  state; the app grows as the group learns.
- **Nothing derived is stored.** Spell slot maxima remain the deliberate exception;
  `campaigns.milestone_level` is stored state, with "level-up waiting" derived from it.

## Features

| Feature | State | Tickets |
|---|---|---|
| Fast reference lookup — six types, ten-second bar, magic items | shipped | redesign → `apple-redesign/home-and-library` |
| Accounts, protected routes, invite-gated fail-closed sign-up | shipped | wall → `apple-redesign/sign-in-wall` |
| Character creation — guided eight-step wizard, campaign-aware; one-page form kept for editing | shipped | rest of `guided-creation/` |
| Character sheet — combat core, skills, rests, attacks, inventory, spell prep, cast flow, concentration, level-up, four segments + beginner mode | shipped | — |
| Campaigns, membership, roles, party glance, encounters + initiative, session/campaign/private notes | shipped | — |
| XP tracking, opt-in | shipped | retiring behind a gate → `dm-run-suite/milestone-leveling` |
| Rules prose in-app — 11 chapters | shipped | 2024 rewrite → `srd-2024-migration/rules-chapters-2024` |
| Installable PWA, online-only (D28) | shipped | — |
| 2024 rules foundation — SRD 5.2.1 data, rules engine, character model, chapters, ASI/feats, long-tail reference data | shipped | `srd-2024-migration/` (6 of 6 done) |
| Apple HIG redesign — tokens, shell, front door, sign-in wall, segmented sheet | shipped | `apple-redesign/` (5 of 5 done) |
| Guided character creation — wizard, vibe quiz, consequences, derived defaults, balance hints | in progress | `guided-creation/` (1 of 5 done) |
| Learn-to-play layer — glossary, learn chapters, roll walkthroughs | ticketed | `learn-to-play/` (3 stubs) |
| DM prep suite — NPCs, locations & handouts, session plans, encounter builder, feature gates | ticketed | `dm-prep-suite/` (5 stubs) |
| DM run suite — player campaign view, reveals, stat blocks, rules crib, log/recap, milestone, table-screen legibility, tracker ergonomics | ticketed | `dm-run-suite/` (8 stubs) |
| Dice roller | out | killed 2026-08-13 (D8) — physical dice are the point |
| Offline data / sync / IndexedDB | out | retired 2026-08-13 (D2); D28 did not revive it |
| Onboarding/tutorials as BRD KPI noise | out | the 2026-08-13 kill is superseded by D33 — teaching returns as `learn-to-play/`, aimed at this table, not at KPIs |
| Social/community features | out | killed 2026-08-13 — one table |
| Multiclassing | out | D15 stands |

## Constraints

- **Technical** — Next.js 16 (App Router, Turbopack), React 19, Neon Postgres + Drizzle
  over `neon-http` (**no transactions — partial writes are the failure mode**; multi-step
  writes are ordered to fail benignly, or derived by query), Neon Auth pinned
  `0.5.0-beta` (D26), shadcn/Radix + Tailwind v4, Vercel. SRD 5.2.1 content ships as
  local JSON data modules (D31) — no DB seed mechanism exists and the coverage ratchet
  must not sweep data. Image storage for handouts/portraits arrives with
  `dm-prep-suite/locations-handouts` (Vercel Blob is the default candidate).
- **Accessibility** — phone-first hygiene, no formal standard (D10): one-handed, dim
  light, real touch targets, nothing breaks at 320px. Every ticket inherits this.
- **Legal / data** — the SRD 5.2.1 attribution (CC-BY-4.0) is the app's **only** SRD
  notice as of `long-tail-reference-data`. The SRD 5.1 notice came out of the footer,
  the README and `src/lib/srd/attribution.ts` in the same change that stopped serving
  5.1 material, because CC-BY §3(a) is about what is actually distributed: the
  reference browser reads local 5.2.1 data and the `dnd5eapi.co` proxy is gone.
  Adventure text is never encoded (D41). GDPR household exemption holds — sign-up stays
  invite-gated and fail-closed (D20), and D34 only shrinks the public surface.
- **Commercial** — none, but the clock is real now: **session 1 has a date, weeks away**
  (2026-08-29). P1 means "before session 1"; P2 means "by session 2, or whenever".
- **Process** — CI is the source of truth; local checks are a dev aid only. Ticket-only
  commits to `main`; code through a PR on a `claude/` branch.
- **Migrations must be additive and nullable** — the production migrate job runs in
  parallel with the deploy.

## Decisions

| ID | Decision | Date | Supersedes |
|---|---|---|---|
| D1 | Players first, DM tools deferred until Jamie actually DMs | 2026-08-13 | BRD §2.3 |
| D2 | No offline. Service worker, manifest, IndexedDB and Zustand persistence deleted; the PWA ambition is retired | 2026-08-13 | BRD |
| D3 | Clerk removed entirely; Neon Auth (managed Better Auth) replaces it | 2026-08-13 | — |
| D4 | Neon Postgres + Drizzle; the Supabase stack deleted rather than integrated | 2026-08-13 | — |
| D5 | v1 needs **both** fast lookup and a playable sheet before it counts as table-worthy | 2026-08-13 | — |
| D6 | Simple creation form for v1; the guided wizard is post-v1 | 2026-08-13 | BRD FR-001 |
| D7 | Sheet scope is combat core, not the BRD's eight-tab sheet | 2026-08-13 | BRD §3.1 |
| D8 | Dice roller never — physical dice are the point of a physical table | 2026-08-13 | — |
| D9 | The 2026-08-15 ticket-record deletion is accepted, not reversed. Content survives in git at `1b151fa^` | 2026-08-15 | — |
| D10 | The accessibility bar is phone-first hygiene, not a formal standard | 2026-08-15 | BRD WCAG target |
| D11 | SRD 5.1 (2014) is the rules baseline wherever it differs from the 2024 PHB | 2026-08-15 | — |
| D12 | DM tools are in scope now — Jamie is about to DM | 2026-08-15 | **D1** |
| D13 | A DM edits every character in their campaign, **including live combat state**; the concurrency guard is a hard prerequisite | 2026-08-15 | — |
| D14 | Campaigns with a membership join table; a character may belong to several | 2026-08-15 | — |
| D15 | Multiclassing is out. Single `class_index` stands | 2026-08-15 | — |
| D16 | Navigation is a bottom tab bar, built once, serving both the sheet↔reference round trip and the DM screen | 2026-08-15 | — |
| D17 | Encounters persist between sessions; monster HP per-instance | 2026-08-15 | — |
| D18 | On screen the word is **race**, not species — SRD 5.1 is the baseline. `speciesIndex` stays as the column name | 2026-08-15 | — |
| D19 | One global `dm`/`player` role gating the DM *tools*; per-campaign authority stays `campaigns.dm_user_id` | 2026-08-15 | — |
| D20 | Sign-up gated by a shared invite code, fail-closed; the GDPR household exemption holds | 2026-08-15 | — |
| D21 | Skills modeled fully: proficiencies, expertise, Jack of All Trades | 2026-08-15 | — |
| D22 | Spell preparation is built; wizard is the two-list model | 2026-08-15 | — |
| D23 | Class resources tracked as generic per-character counters with a recharge rule | 2026-08-15 | DND-033's fallback |
| D24 | A shared table screen at `/table/[token]`, reachable without sign-in via an unguessable regenerable token; shows player-visible state, never monster HP | 2026-08-15 | — |
| D25 | DM edits reach the player's sheet by polling (~15 s); no attribution log | 2026-08-15 | — |
| D26 | `@neondatabase/auth` pinned exactly `0.5.0-beta`; upgrade at GA or on a security advisory — otherwise never | 2026-08-15 | — |
| D27 | Preview-DB credentials stay unset; the production migrate job hard-fails when `DATABASE_URL` is missing | 2026-08-15 | DND-024's full fix |
| D28 | Installable PWA, online-only: the service worker's only job is the `/offline` fallback page | 2026-08-16 | the installability half of **D2** |
| D29 | `docs/rules/` is user-facing product content; all eleven chapters ship under `/rules`, keeping their double duty | 2026-08-16 | reverses `docs/rules/README.md` |
| D30 | Session notes typed during play and written up after; per-note "players can read"; private character notes isolated from the D13 predicate | 2026-08-16 | notes open questions; DND-058 |
| D31 | The rules baseline becomes the **2024 rules — SRD 5.2.1** (CC-BY-4.0). SRD content ships as local JSON data modules; the 2014 `/api/dnd5e` namespace is retired, never repointed in place | 2026-08-29 | **D11** |
| D32 | On screen the word is **species** — the 2024 rules retire "race"; the `species_index` column was named right all along | 2026-08-29 | **D18** |
| D33 | **Teaching is the job until the first campaign runs**; in-session the sheet still wins. The learn-to-play layer (glossary, learn chapters, roll walkthroughs) is in scope, aimed at this table | 2026-08-29 | the 2026-08-13 onboarding/tutorials kill |
| D34 | **Everything behind sign-in** — the public half retires; the middleware matcher inverts to deny-by-default. Exceptions: `/table/[token]` (D24 stands), `/auth/*`, `/offline`, and the reference data endpoints (public + CDN-cached — SRD content, no personal data) | 2026-08-29 | the "reference browsing is public" rule; part of D29's rationale |
| D35 | **Milestone leveling**: one `campaigns.milestone_level` write; "level-up waiting" is derived, never fanned out per character. XP award UI retires behind an off-default gate | 2026-08-29 | resolves DND-055's open question |
| D36 | The **guided creation wizard** replaces the simple form for creation (the edit form survives): vibe quiz → recommended defaults accepted one tap at a time → advanced escape hatch. Creation from a campaign join attaches the finished character to that campaign | 2026-08-29 | **D6**'s deferral |
| D37 | A **player campaign view** exists — party, discovered content, latest recap — reached from the sheet, not the front door | 2026-08-29 | D30's "no player campaign screen" clause |
| D38 | DM prep entities are **revealable**: public layer + DM-only layer + `revealed_at`. Player-facing queries select public columns only; DM-only data never leaves the DM | 2026-08-29 | extends D13/D30 |
| D39 | Design language: **Apple HIG structure, subtle-fantasy tokens**, phones only. Front door is your character; reference becomes the search-first Library; the tab bar stays (renamed Character · Library · DM) | 2026-08-29 | amends **D16** |
| D40 | **Per-campaign feature gates, defaults off** — gates hide UI, never delete state; the DM switches surface on as the group learns | 2026-08-29 | — |
| D41 | The first campaign runs from a **published starter box**; adventure text never enters app data — the DM's own notes only. Session recaps publish as **shared campaign notes** (one player-facing record; the session log is a derived view, not a second entity) | 2026-08-29 | extends D30 |
| D42 | The 2014-era prototype characters are **deleted** before the friends arrive — no legacy mode, no conversion. New 2024 columns need no backfill story | 2026-08-29 | — |

## Open questions

- **Does the app keep the name "D&D 5e Companion" after the 2024 move?** The name is
  baked into the header, tab-title template and the installed PWA manifest — deciding
  before the friends install avoids a re-install-the-icon moment. *Jamie.* Blocks
  nothing.
- **What hosts the table screen — a TV across the room, or a tablet propped mid-table?**
  Decides `dm-run-suite/table-screen-legibility`'s fix: fit-to-screen density for a TV
  vs auto-scroll-to-active for a propped device. *Jamie / the table.* Blocks that stub's
  final shape only.
- **Does character creation happen together at a session zero, or each friend at home?**
  If together, `guided-creation` has an earlier hard deadline than session 1 and
  `party-balance-hints` jumps in value. *Jamie / the table.* Blocks nothing yet.

*Resolved 2026-08-29: XP vs milestone → milestone (D35). "Do the characters fit SRD 5.1
fields" → superseded by the 2024 migration (D31) and the prototype deletion (D42).
Earlier resolutions: see D20–D26 (2026-08-15) and D30 (2026-08-16).*

## Run log

| Date | Commit | What changed |
|---|---|---|
| 2026-08-15 | `b4501fc` | First run. Register established from the recovered 2026-08-13 scope decisions plus a fresh interrogation. Posture: **launch**. 18 decisions recorded. Seven lenses run. 30 tickets cut (DND-016–045). |
| 2026-08-15 | — | Amended by ticket work, not a `/project` run: the prototype push recorded D19–D27, resolved four open questions, refreshed the Features table. |
| 2026-08-29 | `fc1af5e` | Re-run. Posture: **launch**, aimed at the first campaign — session 1 dated, weeks away. Intent rewritten (teaching-first, D33); the morning's planning Q&A + research adopted with provenance (`.icm/docs/2026-08-29-*`); 12 decisions appended (D31–D42). Ticket-scout + five lenses (product, ux, data, tech, copy; market and legal dropped — prior-art and licensing freshly covered by the research doc). Six epics adopted; 6 stubs added (sign-in-wall, asi-and-feats, table-screen-legibility, tracker-ergonomics, advisory sensor, branch prune), ~20 amended, priorities re-ranked to the calendar. |
