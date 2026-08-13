# Scope decisions — 2026-08-13

Jamie made the following calls in a structured scope interrogation (Claude session,
2026-08-13). These supersede the BRD (`.cursor/requirements/processed/
business-requirements.mdx`) wherever they conflict. The BRD remains the reference for
feature *detail*; this document decides feature *existence and order*.

## The decisions

| Question | Decision |
|---|---|
| Who is it for | **Players first, DM later.** Player core (lookup, sheet, creation) is the roadmap; DM campaign tools are deferred until Jamie actually DMs — no ticket until then. |
| Offline | **None.** Plain online web app. Service worker, manifest, IndexedDB layer, Zustand persistence, offline hooks — all deleted, not wired in. The PWA ambition is retired. |
| Auth | **Clerk removed entirely.** Replaced by **Neon Auth** (managed, Stack Auth under the hood; users sync into `neon_auth.users_sync` in the app database). |
| Database | **Neon Postgres + Drizzle ORM.** The Supabase stack (profile route/hook/component, supabase-js clients, Clerk-JWT RLS migrations) is deleted, not integrated — this resolves DND-004. |
| v1 bar | **Both** fast reference lookup (DND-003) **and** a playable character sheet (DND-009) before it counts as table-worthy. |
| Character creation | **Simple form now** (DND-008); the guided 5-step wizard (DND-005) is post-v1 backlog for when a new player joins the table. |
| Sheet scope | **Combat core**: tap-to-adjust HP/temp HP, spell slots, conditions, death saves; read-only stats/skills/saves; character's spells with tap-through to full spell detail. Not the BRD's eight-tab sheet. |
| Dice roller | **Never.** Physical dice are the point of a physical table. |

## Killed outright (do not resurrect)

Dice roller · onboarding/tutorial system · voice search · haptic feedback · offline-first
sync & conflict resolution · social/community features · the BRD's startup KPIs
(retention %, WCAG certification target, 90% coverage mandate, <100KB bundle). Beginner/
advanced creation *modes* survive only inside the deferred wizard ticket (DND-005).

## v1 definition

A friend at the table can: sign in (Neon Auth) → create a character with a simple form →
open its sheet on a phone all session (track HP, slots, conditions, death saves) → look
up any spell/monster/item in under ten seconds. Fully online; no install step.

## Ticket map after these decisions

- **v1 chain (P1, rough order):** DND-003 detail views → DND-006 prune → DND-007
  Neon + Drizzle → DND-002 Neon Auth swap → DND-008 creation form → DND-009 sheet.
- **P2:** DND-001 README · DND-010 CI workflow.
- **P3 / post-v1:** DND-005 guided wizard.
- **Not ticketed:** DM tools (deferred until needed).
