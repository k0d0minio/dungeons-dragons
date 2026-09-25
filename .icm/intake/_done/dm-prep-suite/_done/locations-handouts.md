# Stub: Locations and handouts, staged for reveal

- feature-slug: locations-handouts
- sequence: 2 of 5
- depends-on: npc-roster
- priority: P1
- size: L
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

Two more revealable entities on the pattern `npc-roster` established:
**locations** (name, player-facing description, DM-only notes/secrets) and
**handouts** (a titled image or text the DM stages in advance — a letter, a map
fragment, a symbol). Handouts need image upload, which the app has never had —
pick the storage (Vercel Blob is the least-new-infrastructure candidate; flag
the env var in `.env.example` names-only per the no-secrets rule) and keep
uploads small and phone-friendly. Also wire the deferred NPC portrait slot, and
add the `characters.portrait` column (nullable) the player campaign view expects
— no other stub owns it.

> Amended 2026-08-29 (`/project` re-run, tech + data lenses): upload rails —
> order the cross-system write **blob-first** (orphaned blob on failure, never a
> handout row whose image 404s), validate file type server-side by magic bytes,
> **no SVG** in the allowlist (stored-XSS class), upload-only (no import-from-URL
> — that's the SSRF door). Unrevealed handouts are secrets: serve images via an
> authed route or signed URLs, not guessable public blob URLs. When uploaded
> images first render in-app, that is the moment to add a CSP header
> (`next.config.ts` carries only XFO/nosniff/referrer today).

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-prep-suite/locations-handouts.md` and the epic's `breakdown.md`.
On the revealable-entity pattern from `npc-roster`: add campaign-scoped
locations and handouts with DM-gated CRUD. Choose and integrate image storage
(evaluate Vercel Blob first; record the choice in the PR), with upload size/type
limits suited to phones; add the storage env var name to `.env.example`
(names and comments only, never values) and note it needs setting in Vercel.
Add the optional NPC portrait using the same storage. No player-facing surface
yet. PR on a `claude/` branch; CI green only.
