# Stub: Retire the 2014 proxy — spells, monsters and magic items on SRD 5.2.1

- feature-slug: long-tail-reference-data
- sequence: 6 of 6
- depends-on: srd-data-layer
- priority: P1
- size: L
- sources: .icm/docs/2026-08-30-dnd5eapi-2024-coverage.md

`srd-data-layer` shipped the creation-critical content locally and left the long tail
where it was, because there is nowhere for it to go: `dnd5eapi.co`'s `/api/2024`
namespace has **no `spells` endpoint at all** (404, and absent from its index) and
**3 monsters** where 2014 has 334. Class level tables are advertised by every class
payload and 404 on request. So the reference browser — spells, monsters, magic items —
is still served by `/api/dnd5e/*` off SRD 5.1, and the footer still carries the 5.1
attribution alongside the 5.2.1 one because CC-BY §3(a) is about the material actually
distributed.

This stub closes that. Two routes, decided by what upstream looks like when it is picked
up (re-probe first; the coverage doc is a 2026-08-30 snapshot):

1. **Upstream filled in** — spells and a full monster list exist under `/api/2024`. Build
   a **new** `/api/dnd5e-2024/*` namespace beside the old one and retire `/api/dnd5e/*`
   whole. Never repoint a 2014 route at 2024 data: those responses sit behind an 8-day
   CDN/Data-Cache window (D31), so changing an endpoint's meaning in place can serve one
   player 2014 Fireball and the next 2024 Fireball inside the same session.
2. **Upstream still short** — import an open SRD 5.2.1 dataset locally as JSON data
   modules, the way `src/lib/srd/` already does, and drop the proxy entirely. ~400 spells
   and 300+ monsters is more data than the creation sets but the same shape; the existing
   `scripts/srd/build-srd-data.mjs` and its verify-against-the-PDF discipline are the
   pattern. Upstream was wrong on 9 of 38 weapon rows, so a checked local copy is not a
   worse outcome than a proxy.

Whichever route: whatever data endpoints survive stay **public and CDN-cached** (D34 —
pages are what the sign-in wall protects, not reference data), and the SRD 5.1 attribution
comes out of the footer, the README and `src/lib/srd/attribution.ts` **in the same PR that
stops serving 5.1 material** — not before, and not after.

Note that `rules-chapters-2024` covers `docs/rules/`, the other SRD 5.1 surface. Both have
to land before the 5.1 notice can go.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/srd-2024-migration/long-tail-reference-data.md`, the epic's `breakdown.md`,
and `.icm/docs/2026-08-30-dnd5eapi-2024-coverage.md`. Re-probe `dnd5eapi.co`'s
`/api/2024` namespace — specifically whether `spells` now exists and how many `monsters`
it has — and pick the route the stub describes accordingly, recording what you found in
the PR description. Then move the reference browser (spells, monsters, magic items) onto
SRD 5.2.1, retiring the `/api/dnd5e/*` namespace whole rather than repointing it. Follow
`src/lib/srd/` for the local-data pattern if you import. Never include non-SRD content.
Schema changes, if any, must be additive and nullable. Code goes through a PR on a
`claude/` branch; CI is the only evidence of green.
