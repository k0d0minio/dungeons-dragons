# Stub: The sign-in wall — deny-by-default, named exceptions

- feature-slug: sign-in-wall
- sequence: 4 of 5
- depends-on: home-and-library
- priority: P1
- size: M
- sources: .icm/project.md D34; product/tech/data lenses 2026-08-29

The public half retires (D34). Today `src/proxy.ts` allowlists four protected page
prefixes and its header comment still says reference browsing "stays fully public" —
superseded intent baked into code. Invert to deny-by-default: every page requires a
session except `/table/[token]` (the token is the credential, D24), `/auth/*`,
`/offline` (the service worker fetches it signed-out at install — behind the wall it
would permanently cache the sign-in page as the offline fallback), and static assets.
The reference *data* endpoints stay public and CDN-cached (D34 — SRD content, no
personal data); app API routes keep 401-ing in-route per existing doctrine. The
`/api/table/[token]` and `/api/invite` routes stay public on purpose.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/apple-redesign/sign-in-wall.md` and the epic's `breakdown.md`. Invert
`src/proxy.ts` to protect pages by default with the named public exceptions in the
stub (pages only — data endpoints under `/api/dnd5e/*` or its successor stay public
per D34; `/api/table/[token]`, `/api/invite`, `/api/auth/*` stay public on purpose).
Rewrite the file's header comment to state D34. Verify signed-out flows: the welcome
screen renders, the table screen works by token alone, `/offline` is fetchable and
the service worker install succeeds signed-out. Add tests for the exception list.
PR on a `claude/` branch; CI green only.
