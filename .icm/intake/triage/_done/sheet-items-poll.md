# Stub: The sheet polls its combat state but not its item rows

- lane: tweak
- found-by: `first-table/dm-character-profile` review, 2026-09-05
- priority: P2
- size: S

`CharacterSheet` seeds `items` from the server render into state, and the 15 s poll in
`use-combat-state.ts` adopts only `body.character` from `GET /api/characters/[id]` — the
response carries no items. So a weapon the DM readies from the profile (an item-row PATCH,
which bumps no version) reaches an open sheet only on its next load; the Turn and Attacks
cards render from the local rows until then. The profile's toast says as much ("the next
time it opens"), so nothing lies — but the Inspiration and slot fixes do arrive within a
poll, and the weapon one is the odd one out.

Have `GET /api/characters/[id]` return `items` beside `character`, and let the tick hand
them to an `onItems` callback the sheet wires to `setItems`, guarded by the same `queued`
flag so an optimistic Gear tap is never overwritten by a stale poll. Then the toast can say
"within a few seconds" again.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/sheet-items-poll.md`. Fix it on a `claude/` branch and open a PR; CI is
the only evidence. `git mv` the stub into `.icm/intake/triage/_done/` in the same PR.
