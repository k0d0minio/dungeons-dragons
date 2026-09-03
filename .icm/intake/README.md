# Intake — the work for this repo

> This folder follows the estate-wide ticket standard (canonical spec:
> `_system/contracts/TICKETS.md` in the icm-board repo; this file is its self-contained
> micro-copy, and `.icm/CONTEXT.md` is the map of the folder around it). Tickets are
> **stubs**, and a stub never lives alone.

## The shape

- **Related work is an epic** — `<epic-slug>/`: a `breakdown.md` (what was understood,
  plus a `## Build order`) and one stub per unit of work. Every stub carries
  `- feature-slug:` matching its filename, `- sequence: <n> of <m>` (contiguous `1..m`),
  and `- depends-on:` (`none`, or in-epic slugs sequenced earlier). A single-stub epic is
  fine.
- **One-off findings are triage stubs** — `triage/<slug>.md`, carrying
  `- lane: bug | tweak | chore` and `- found-by:`. Park one in a minute and move on —
  never widen the current PR to absorb it.
- **Identity is the path** — a ticket is `<epic-slug>/<feature-slug>`; there are no ticket
  numbers. The H1 is `# Stub: <title>`.
- **Optional dash-lines** — `- priority: P0|P1|P2` (P0 urgent · P1 next · P2 whenever),
  `- size:`, `- blocked: <reason>` (delete the line when the blockage lifts), and
  `- sources:` to cite the evidence.
- **The `## Prompt` is the pick-up contract** — it has to stand alone when pasted into a
  fresh Claude session at the repo root, because the board's "Copy prompt" sends _only_
  that section. Write it cold, and have it tell the session to read the stub file for the
  rest.

## Status is positional

Where a file sits **is** its state. Open is a stub in a live epic or in `triage/`; an
epic's next stub is its lowest unmet sequence.

Done is a folder move, never a field: `git mv` the stub into its epic's (or triage's)
`_done/` in the same PR that finishes the work. Abandoned work moves there too, with a
`> Dropped: <reason, date>` line prepended. Nothing is ever deleted, and a slug is never
reused within an epic. A completed epic archives whole —
`git mv .icm/intake/<epic>/ .icm/intake/_done/<epic>/`.

The board reads this folder from `main` via the GitHub API, so an unpushed stub does not
exist. `_done/` is also where the legacy archive lands: flat `DND-NNN` tickets
(pre-2026-08-28) are left exactly as they are — migrating a repo off them is `/project`'s
judgment call, never a side effect of other work.

Any plan, backlog, or task list for this repo becomes stubs here — never a loose
`TODO.md` or `BACKLOG.md` at the root.
