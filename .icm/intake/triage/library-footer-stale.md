# Stub: The Library still says "Powered by D&D 5e API"

- lane: tweak
- found-by: first-timer audit, 2026-09-05 (`.icm/docs/2026-09-05-first-timer-audit.md` §E)
- priority: P2
- size: S

`/library` ends with "Powered by D&D 5e API • Built with Next.js, SWR, and shadcn/ui".
The `dnd5eapi.co` proxy was retired by `srd-2024-migration/long-tail-reference-data`;
every lookup is answered from `src/lib/srd/data/`. Drop the line (the SRD attribution
in the site footer is the only notice the app needs — see the register's Legal
constraint) or replace it with nothing.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/library-footer-stale.md`. Fix it on a `claude/` branch and open a
PR; CI is the only evidence. `git mv` the stub into `.icm/intake/triage/_done/` in the
same PR.
