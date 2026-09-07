# Stub: The sheet's client bundle now carries two SRD JSON files it barely reads

- lane: chore
- found-by: `first-table/inventory-trim`, 2026-09-05
- priority: P2
- size: S

`src/components/characters/sheet/inventory-rules.ts` decides whether an inventory holds a
magic item (name-match a custom row against the 262 SRD magic items; index in
`MAGIC_ITEMS` but not `EQUIPMENT`) and folds a pack's contents. It does that by importing
`MAGIC_ITEMS` and `EQUIPMENT` statically into a client component — roughly 340 KB of raw
JSON in the sheet's bundle, for a names list and seven packs' contents. `attacks-card.tsx`
already ships `weapons.json` the same way, so the pattern is not new, but the sheet is the
page opened on a phone mid-fight.

Have `scripts/srd/` emit a small generated module — magic-item names (index + name only)
and the packs' `contents` — and import that instead. Behaviour and tests unchanged; the
rule stays pure.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/sheet-bundle-srd-json.md`. Fix it on a `claude/` branch and open a
PR; CI is the only evidence. `git mv` the stub into `.icm/intake/triage/_done/` in the
same PR.
