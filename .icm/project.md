# D&D 5e Companion — project register

> Last `/project` run: 2026-08-15 · commit `b4501fc`
> Maintained by `/project`. Amend by re-running it, not by hand-editing during a session.

## What this is

A mobile-first D&D 5th Edition companion for Jamie and the friends and family at his
physical table. Two halves of one job: fast reference lookup, and a character sheet you
keep open on your phone for a whole session. As of 2026-08-15 it is also growing a DM
side, because Jamie is about to run a game. Personal project, personal scale — one table,
no customers, no revenue.

## Intent

- **For whom** — Jamie, the players at his table, and (from 2026-08-15) Jamie as DM.
  Players remain the primary user; the DM is one person who also plays.
- **The job** — be the thing on the table next to the dice. Answer a rules lookup in under
  ten seconds, and hold the character's live state for three hours without being fiddly.
  If lookup and sheet ever conflict, the sheet wins — it is the one thing with no paper
  fallback once a session is underway.
- **Done looks like** — *v1 (agreed 2026-08-13, code complete 2026-08-14, never played):*
  a friend signs in, creates a character with a simple form, opens its sheet on a phone
  and runs a whole session off it (HP, temp HP, spell slots, conditions, death saves),
  and looks up any spell, monster or item in under ten seconds.
  *v2 (agreed 2026-08-15):* Jamie runs a session from behind the screen — party at a
  glance, an encounter with initiative order and per-monster HP, and the ability to edit
  a player's character.
- **Explicitly not** — a product. No customers, no pricing, no growth. Not a VTT, not a
  campaign manager, not a replacement for physical dice or a physical table.

## Business logic

- **Reference browsing is public.** No sign-in, no account, no gate. It is the half of the
  app a stranger may use freely, and that is deliberate.
- **Character data requires a session.** `/api/characters` answers `401` rather than
  redirecting; a page redirects.
- **A character belongs to its owner.** Today every read is owner-scoped inside the query
  rather than checked after the fact, so another user's character id is indistinguishable
  from one that never existed — it 404s rather than 403s. That property is deliberate and
  is to be preserved for players.
- **A DM sees and edits every character in a campaign they run.** A player still sees only
  their own. This is the first access rule in the app beyond "owner", and it includes live
  combat state — HP, slots, conditions, death saves — not only the character's build
  (see D13, and the divergence recorded there).
- **A character may belong to several campaigns.** Membership is a join table, not a
  column on the character.
- **A DM's own notes are not player-readable.** Session and campaign notes carry a
  visibility rule; a player's per-character notes are their own.
- **Rules baseline is SRD 5.1 (2014)** — it is what `dnd5eapi.co` serves and what
  `docs/rules/` is written against. Where the 2024 PHB differs, SRD 5.1 wins.
- **Nothing derived is stored.** Ability modifiers, proficiency bonus and saving throws are
  computed from `classIndex` and `level`. Spell slot *maxima* are the deliberate exception,
  because warlock pact magic breaks derivation.

## Features

| Feature | State | Tickets |
|---|---|---|
| Fast reference lookup — spells, classes, races, equipment, monsters | shipped | DND-003 |
| Reference lookup that meets the ten-second bar on a phone | shipped | DND-020, DND-021, DND-022 |
| Magic items in reference lookup | shipped | DND-045 |
| Accounts and protected routes (Neon Auth) | shipped | DND-002 |
| Sign-up that works for someone who is not Jamie — invite-gated, fail-closed (D20) | shipped | DND-016, DND-044 |
| Character creation — simple form | shipped | DND-008 |
| Character sheet — combat core | shipped | DND-009 |
| Character sheet — readable at a table in dim light | shipped | DND-019, DND-023 |
| Edit a character after creation | shipped | DND-018 |
| Skill proficiencies | shipped | DND-015 |
| Level-up | shipped | DND-032 |
| Rests and recovery, incl. hit dice | shipped | DND-033 |
| Attacks and actions on the sheet | shipped | DND-034 |
| Inventory — equipped weapons and currency | shipped | DND-035 |
| Spell preparation | shipped | DND-036 |
| Conditions and quick-reference rules prose in-app | shipped | DND-037 |
| Campaigns and party membership — join links, roster, DM sees & edits the party (D13) | shipped | DND-026, DND-027, DND-028, DND-046 |
| Global DM/player role gating the DM tools | shipped | DND-047 |
| DM party glance | shipped | DND-030 |
| Encounters, initiative and monster HP in play | shipped | DND-031 |
| Campaign and session notes — dated notes on the campaign page, per-note "players can read", quick capture on the tracker (D29) | shipped | DND-058 |
| Per-character session notes — private to the player, owner-only (D29) | shipped | DND-058 |
| Guided character creation wizard | wanted | — was DND-005, deleted 2026-08-15 with the board |
| Dice roller | out | killed 2026-08-13 — physical dice are the point of a physical table |
| Installable PWA — home-screen icon, standalone display, offline *page* only (D28) | shipped | DND-048 |
| Offline data / sync / IndexedDB | out | retired 2026-08-13 (D2); D28 deliberately did not revive it |
| Onboarding, tutorials, voice search, haptics | out | killed 2026-08-13 as BRD startup-KPI noise |
| Social and community features | out | killed 2026-08-13 — one table, no network effects |
| Multiclassing | out | D15, 2026-08-15 — single class only |

## Constraints

- **Technical** — Next.js 16 (App Router, Turbopack), React 19, Neon Postgres + Drizzle
  over the `neon-http` driver, Neon Auth (`@neondatabase/auth`, a `0.5.0-beta`
  prerelease carrying the whole auth boundary), shadcn/Radix + Tailwind v4, deployed on
  Vercel. Reference data is proxied from the free community API `dnd5eapi.co` — its
  latency and uptime are a hard ceiling on the ten-second bar until the proxy is cached.
  `neon-http` cannot do transactions, so anything writing several tables at once has
  partial writes as its failure mode.
- **Accessibility** — **phone-first hygiene, no formal standard.** The bar: usable
  one-handed on a phone, in dim light, at a table. Real touch targets, readable contrast,
  nothing that breaks at 320px, and the in-session actions reachable with one thumb. This
  is not audited against WCAG — the BRD's certification target was killed 2026-08-13 as
  startup-KPI noise. Every ticket inherits this; none re-litigates it.
- **Legal / data** — SRD 5.1 content is CC-BY-4.0 and its attribution is a live obligation
  on a public deployment (DND-017). The repo's MIT licence must not appear to cover it.
  GDPR + Portugal's Lei n.º 58/2019 apply; the household exemption covers this scale
  *provided* sign-up is not open to strangers (DND-044).
- **Commercial** — none. No deadline, no budget, no client. The only schedule pressure is
  a real session actually happening.
- **Process** — CI is the source of truth. Local `jest`/`eslint`/`tsc` runs are allowed
  as a development aid (Jamie, 2026-08-15 — the old outright ban predates having a CI
  that runs them at all), but nothing counts as passing until the CI check is green, and
  CI is the only evidence ever cited. Ticket-only commits go to `main`; code goes
  through a PR on a `claude/` branch.
- **Migrations must be additive and nullable.** The production migration workflow runs in
  parallel with the Vercel deploy by design, so a `NOT NULL` add is a live outage window.

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
| D9 | The 2026-08-15 ticket-record deletion is accepted, not reversed. `_done/`, the four then-open tickets and the four `.icm/docs/` runbooks stay deleted; the board restarts at DND-016. Their content survives in git at `1b151fa^` | 2026-08-15 | — |
| D10 | The accessibility bar is phone-first hygiene, not a formal standard | 2026-08-15 | BRD WCAG target (killed 2026-08-13) |
| D11 | SRD 5.1 (2014) is the rules baseline wherever it differs from the 2024 PHB | 2026-08-15 | — |
| D12 | DM tools are in scope now — Jamie is about to DM | 2026-08-15 | **D1** |
| D13 | A DM edits every character in their campaign, **including live combat state**. Recorded as a deliberate divergence: D&D Beyond shipped DM-edits-player-HP and then removed it, and now treats player-controls-own-HP as by-design, for table authority and for concurrency. Accepted anyway; the concurrency guard (DND-028) is a hard prerequisite rather than a follow-up | 2026-08-15 | — |
| D14 | Campaigns with a membership join table; a character may belong to several | 2026-08-15 | — |
| D15 | Multiclassing is out. Single `class_index` stands, and hit dice, slots and level-up are built against it | 2026-08-15 | — |
| D16 | Navigation is a bottom tab bar, built once, serving both the sheet↔reference round trip and the DM screen | 2026-08-15 | — |
| D17 | Encounters persist between sessions; monster HP is tracked per-instance, not per-index | 2026-08-15 | — |
| D18 | On screen the word is **race**, not species — SRD 5.1 is the baseline and it is what the reference half already says. `speciesIndex` stays as the column name | 2026-08-15 | — |
| D19 | One global user role, `dm` or `player`, in a `public.user_roles` table. It gates the DM *tools* only — seeing `/dm`, creating campaigns. Per-campaign authority stays `campaigns.dm_user_id` and nowhere else (the schema's "roster, not a permission grant" warning stands). No row means `player`, so sign-up needs no hook; a migration seeds `jamie.nisbet@outlook.be` as `dm` and every other existing user as `player` | 2026-08-15 | — |
| D20 | Sign-up is gated by a shared invite code (`SIGNUP_INVITE_CODE` env var, never in git), **fail-closed** when unset. Friends join with the code and default to `player`; strangers cannot register, so the GDPR household exemption holds and no privacy notice is needed | 2026-08-15 | resolves DND-044's branch choice |
| D21 | Skills are modeled fully: chosen proficiencies, expertise (double bonus), and derived Jack of All Trades. Rogue/bard numbers must be right, not approximate | 2026-08-15 | — |
| D22 | Spell preparation is built (DND-036) regardless of the current roster. Wizard is the two-list model: `known` is the spellbook, `prepared` a subset — no third list | 2026-08-15 | — |
| D23 | Class resources (rage, ki, channel divinity, …) **are** tracked, as generic per-character counters with a recharge rule, restored by rests | 2026-08-15 | DND-033's scope-out fallback |
| D24 | Encounters ship a shared table screen: `/table/[token]`, reachable without sign-in via an unguessable, regenerable token; shows initiative order and player-visible state, never monster HP | 2026-08-15 | — |
| D25 | A DM edit reaches the player's open sheet by polling (~15 s SWR refresh + focus revalidation). No attribution log — at one physical table you say it out loud | 2026-08-15 | — |
| D26 | `@neondatabase/auth` pinned exactly at `0.5.0-beta` (the whole auth boundary rides on it, including the nested `better-auth` that does the session work). Upgrade trigger: Neon Auth reaching GA, or a security advisory — otherwise never | 2026-08-15 | — |
| D27 | Preview-database credentials stay deliberately unset: migrations continue to first-apply against production on merge, accepted. In exchange the production migrate job now **hard-fails** when `DATABASE_URL` is missing instead of green-ticking a skip | 2026-08-15 | DND-024's full fix |
| D28 | Installable PWA, **online-only**: manifest, icons, standalone display, and a service worker whose only job is the `/offline` fallback page — nothing else is ever cached, so it cannot fight D25's polling or DND-028's guard. Offline data stays retired | 2026-08-16 | the installability half of **D2** |
| D29 | Session notes are **typed during play _and_ written up afterwards** — dated notes on the campaign page plus a one-thumb quick-capture field on the encounter tracker, appending to the note whose `session_date` is today. Per-note "players can read" is the only way a note leaves the DM; a shared note is read at the foot of the sheet of every character in that campaign, which is the whole player surface — no player campaign screen. Per-character private notes ship alongside, owner-only in their own table so the D13 viewer predicate cannot reach them. Both are plain saves, never DND-028's 409 path | 2026-08-16 | answers both notes open questions; DND-058 |

## Open questions

- **Do the characters at the actual table fit SRD 5.1 fields** — no subclasses, no feats?
  Expertise is representable as of D21; subclass-driven mechanics (Eldritch Knight
  slots) and feats still are not. *Jamie / the table.*

*Resolved 2026-08-15 (see D20–D26): prepared casters (build it either way, D22), shared
table screen (yes, token link, D24), live updates on DM edits (poll, no attribution,
D25), auth beta posture (pin exact, revisit at GA, D26).*

*Resolved 2026-08-16 (see D29): both notes questions — session notes are typed during
play as well as written up afterwards, and per-character private notes ship with them.*

## Run log

| Date | Commit | What changed |
|---|---|---|
| 2026-08-15 | `b4501fc` | First run. Register established from the recovered 2026-08-13 scope decisions plus a fresh interrogation. Posture: **launch** — the whole v1 chain shipped but has never been played at a table. 18 decisions recorded (D1–D8 adopted with provenance, D12 supersedes D1). Seven lenses run. 30 tickets cut (DND-016–045), DND-015 amended. Board restarted at DND-016 per D9. |
| 2026-08-15 | — | Amended by ticket work, not a `/project` run: the prototype push (Jamie's interrogation of 2026-08-15) recorded D19–D27, resolved four open questions, and refreshed the Features table for the nine tickets that had shipped without leaving intake. Next `/project` run should reconcile. |
