# Stub: Encounter builder with a difficulty readout

- feature-slug: encounter-builder
- sequence: 4 of 5
- depends-on: none
- priority: P1
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-research.md §4, .icm/docs/2026-08-16-value-audit.md (encounter difficulty budget)

Encounters are currently assembled without any difficulty signal — a new-DM
trap. Build encounters from the SRD 5.2.1 monster data with a live difficulty
readout using the 2024 XP-budget method (low / moderate / high per party size
and level), computed against **the actual party** — and, since attendance
varies at a 5–6 player table, re-computable for who's present tonight. Saved
encounters feed the existing initiative tracker unchanged. Closes the value
audit's "encounter difficulty" gap.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-prep-suite/encounter-builder.md` and the epic's `breakdown.md`.
Confirm `srd-2024-migration/srd-data-layer` is done (its epic's `_done/`) — the
2024 monster data and XP budgets come from it; flag and stop if not. Extend the
DM encounter creation flow: search/add monsters with counts, live 2024
XP-budget difficulty label computed from the campaign's characters (levels and
a toggle for who's attending), warnings when past "high". Keep the existing
tracker contract (`src/lib/encounters/tracker.ts`) untouched — this feeds it,
nothing more. Unit-test the budget math. PR on a `claude/` branch; CI green
only.
