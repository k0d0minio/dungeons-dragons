# Stub: The edit form throws React #418 in production

- lane: bug
- found-by: first-timer audit, 2026-09-05 (`.icm/docs/2026-09-05-first-timer-audit.md` §E)
- priority: P2
- size: S

Opening `/characters/[id]/edit` on production logs "Minified React error #418" (a
hydration mismatch, `args[]=HTML`) once per load; the page renders regardless. Reproduce
in a dev build to get the unminified message, find the server/client difference in
`character-form.tsx` or the pickers under it (a locale- or date-dependent render, a
`window` read, a `Math.random` key are the usual suspects), and fix the cause rather
than suppressing the warning.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/edit-page-hydration-error.md`. Fix it on a `claude/` branch and open
a PR; CI is the only evidence. `git mv` the stub into `.icm/intake/triage/_done/` in the
same PR.
