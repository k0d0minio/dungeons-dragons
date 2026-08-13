# DND-004 · Decision — orphaned offline-first + profile stacks: integrate or delete

| | |
|---|---|
| Type | decision |
| Priority | P1 |
| Size | M |

## Problem
Two whole subsystems are built, tested, and imported by **nothing**:

- **Profile stack** — `/api/profile` route, `src/hooks/useProfile.ts`,
  `src/components/ProfileSection.tsx`, plus two Supabase migrations
  (`supabase/migrations/2025-09-27*`, Clerk-JWT RLS profiles schema). Backend complete,
  no page renders it.
- **Offline-first layer** — `src/lib/stores/characterStore.ts`, `referenceStore.ts`,
  `src/lib/pwa/offline-hooks.ts`, `src/lib/pwa/database.ts` (IndexedDB), and the
  duplicate `src/lib/dnd-api/hooks.ts` (the page uses `swr-hooks.ts` only).

Yet "Offline-First" is the app's stated architecture (`.cursor/project.json` →
`architecture.patterns`) and the BRD's primary objective is an "intuitive,
offline-capable mobile reference tool" with "Full offline functionality for core
features" as a success metric (business-requirements.mdx §1.2–1.3, FR-005). The real
question is scope: is this still the ambitious offline-first companion, or a slim online
reference browser? That's Jamie's call — this ticket produces the evidence, not the
verdict.

## Decision (2026-08-13) — DELETE BOTH

Jamie decided in a structured scope interrogation (recorded in
`.icm/docs/scope-decisions-2026-08-13.md`, which stands in for the audit report):

- **Offline layer: delete.** The app is fully online — no PWA, no service worker, no
  IndexedDB, no sync. The offline-first ambition (FR-005) is retired outright.
- **Profile stack: delete.** Supabase is replaced by Neon Postgres + Drizzle
  (DND-007); auth moves from Clerk to Neon Auth (DND-002 rewritten). The
  Supabase-specific profile stack integrates with nothing that survives.

Follow-up tickets cut: DND-006 expanded to execute both deletions; DND-007 (Neon +
Drizzle), DND-008 (creation form), DND-009 (combat-core sheet), DND-010 (CI). Once
DND-006 lands, this ticket moves to `_done/` — Jamie's move, per the gate rule.

## Acceptance
- [ ] A short report in `.icm/docs/` mapping each orphaned module to: what it does, test state, cost to wire in, cost to delete
- [ ] A recommended path (integrate / delete / partial) with reasoning against the BRD's offline requirements (FR-005)
- [ ] Jamie has decided; follow-up build or deletion tickets are cut accordingly
- [ ] No code changes in this ticket — decision only

## Prompt

Audit the two orphaned subsystems in the D&D 5e Companion PWA — the profile stack
(`/api/profile`, `useProfile`, `ProfileSection`, `supabase/migrations/2025-09-27*`) and
the offline-first layer (`src/lib/stores/*`, `src/lib/pwa/*`, duplicate
`src/lib/dnd-api/hooks.ts`). For each module: what it does, whether its tests pass in
CI, what wiring it in would take, what deleting it would take. Write the findings and an
integrate-vs-delete recommendation to `.icm/docs/offline-profile-audit.md`. Make no code
changes; the decision is Jamie's. Read `.icm/intake/DND-004-offline-profile-decision.md`
for full context.
