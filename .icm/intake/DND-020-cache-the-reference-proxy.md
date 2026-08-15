# DND-020 · Cache the reference proxy — the ten-second bar is being spent on the network

| | |
|---|---|
| Status | ready |
| Type | bug |
| Priority | P1 |
| Size | S |
| Sources | tech lens · data lens · product lens (all three independently) · `src/app/api/dnd5e/spells/route.ts:11` · `src/lib/dnd-api/swr-hooks.ts:102` |

## Problem

None of the eleven `/api/dnd5e/*` route handlers set `revalidate`, `cache`, or a response
`Cache-Control` header. Next 15+ defaults a bare `fetch` to `no-store`, so **every single
lookup re-pulls live from dnd5eapi.co** — a free, community-run API — with nothing cached at
the CDN, the edge, or the function.

The v1 bar is "look up any spell, monster or item in under ten seconds". That bar is
currently pinned directly to a third party's latency and uptime, over table wifi, per user,
per tap. The home page fires five list fetches on first paint
(`src/app/page.tsx:45-49`), each a cold serverless function making a full upstream request.

SRD 5.1 data has not changed since 2014. This is pure waste, and it is the change with the
largest payoff per line of code in the whole backlog — all three of the product, data and
tech lenses raised it independently.

Two related points that belong in the same change:

- **SWR's `dedupingInterval: 60000` (`swr-hooks.ts:102`) is not a cache.** It is per-tab and
  dies on reload. It is not covering for the missing server-side cache.
- **`index` is interpolated into the upstream URL with only an emptiness check**
  (`src/app/api/dnd5e/spells/[index]/route.ts:33-40`, and identically in the other four
  `[index]` routes). It cannot reach a different origin — the base host is fixed and a path
  cannot escape it — so this is not SSRF. But it makes the routes a general proxy for any
  path on that host, and the moment caching lands it becomes an unbounded cache-key space.
  A `/^[a-z0-9-]+$/` guard closes it, and it belongs here rather than in its own ticket.

## Acceptance

- [ ] All eleven `/api/dnd5e/*` handlers cache their upstream fetch
- [ ] Cached responses survive a page reload and a new visitor — verify at the CDN, not just
      in-tab
- [ ] The `[index]` segment is validated against `/^[a-z0-9-]+$/` on all five detail routes
- [ ] Nothing in `/api/characters/*` is touched — those are correctly `force-dynamic`
- [ ] CI green

## Prompt

Cache the D&D reference proxy in the D&D 5e Companion. Right now every lookup makes a live
call to dnd5eapi.co, and the app's whole reason to exist is answering a rules question in
under ten seconds at a table.

None of the eleven route handlers under `src/app/api/dnd5e/` pass any cache option to `fetch`
— see `src/app/api/dnd5e/spells/route.ts:11` and the identical shape in the others. Next
defaults bare `fetch` to `no-store`, so nothing is cached anywhere. SRD 5.1 data is
immutable, so a long revalidate window is free; Jamie has not set a specific staleness
tolerance, so pick something generous (a day or more) and say what you chose and why in the
PR. Consider whether a `Cache-Control` header on the response is also warranted so the Vercel
CDN serves repeat requests without invoking the function at all.

In the same change, validate the `[index]` route segment against `/^[a-z0-9-]+$/` in all five
detail routes (`spells/[index]`, `classes/[index]`, `races/[index]`, `equipment/[index]`,
`monsters/[index]`). Today it is checked only for emptiness before being interpolated into
the upstream path, which makes these general proxies for any path on that host and, once
caching lands, an unbounded cache-key space.

Do not touch anything under `src/app/api/characters/` — those are deliberately
`force-dynamic` and must stay that way. And note that SWR's `dedupingInterval` in
`src/lib/dnd-api/swr-hooks.ts:102` is per-tab and dies on reload; it is not a substitute and
should not be adjusted in place of doing this properly.

There is a second, unused API client at `src/lib/dnd-api/client.ts` advertising a 24-hour
in-memory cache. **Do not use it** — it is dead code imported only by its own test, and
DND-039 deletes it.

Read `.icm/intake/DND-020-cache-the-reference-proxy.md` and `.icm/project.md` for context.
Open a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
