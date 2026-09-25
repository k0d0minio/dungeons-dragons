# Stub: Tracker ergonomics — Next turn under the thumb, no fatal mis-taps

- feature-slug: tracker-ergonomics
- sequence: 8 of 8
- depends-on: none
- priority: P1
- size: S
- sources: ux lens 2026-08-29 (encounter-tracker.tsx:339-352, combatant-row.tsx:221-230)

Three cited mid-fight failures against the D10 one-thumb bar: (1) "Next turn" — the
most-tapped control — sits in the tracker header, a full scroll away once ~10
combatants stack three sub-rows each; (2) nothing scrolls the active row into view
on advance; (3) the combatant remove ✕ is one un-confirmed optimistic tap with no
undo — a mis-tap loses rolled initiative and current HP (encounter *delete* has an
AlertDialog; a per-row control in the thumb zone has nothing).

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-run-suite/tracker-ergonomics.md` and the epic's `breakdown.md`. In
the DM encounter tracker (`src/components/encounters/encounter-tracker.tsx`,
`combatant-row.tsx`): make turn advancement reachable without scrolling (sticky
control clearing `--bottom-nav-height`), scroll the active row into view on advance,
and guard combatant removal with a confirm or an undo toast. No layout rewrite —
targeted ergonomics only. PR on a `claude/` branch; CI green only.
