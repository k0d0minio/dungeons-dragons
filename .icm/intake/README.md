# Intake — the ticket backlog for this repo

> This folder follows the estate-wide ticket standard (`.icm/intake/`, canonical spec:
> `_system/TICKETS-SPEC.md` in the Apps estate). One markdown ticket per unit of work,
> named `DND-NNN-slug.md`; numbers are never reused. Each ticket carries an H1
> (`# DND-NNN · Title`), a `Priority` row (`P0`/`P1`/`P2`), and a `## Prompt` section
> that stands alone when pasted into a fresh Claude session at the repo root. Optional
> `Status` row: `ready` → `today` → `in-progress` → `blocked` (missing = `ready`). Finished
> tickets are `git mv`'d to `_done/` — the folder move is the state change. The admin
> dashboard's Tickets board reads this folder from `main`.

Any plan, backlog, or task list for this repo becomes tickets here — never a loose
`TODO.md` or `BACKLOG.md` at the root.
