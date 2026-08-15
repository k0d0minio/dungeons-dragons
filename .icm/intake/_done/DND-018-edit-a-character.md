# DND-018 · Edit a character after creation

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P0 |
| Size | M |
| Sources | data lens · ticket-scout · `src/app/api/characters/[id]/route.ts:52` · `src/lib/db/characters.ts:101` · `src/lib/characters/schema.ts` |

## Problem

Characters are effectively write-once. `POST /api/characters` creates one; `PATCH
/api/characters/[id]` accepts **only** `combatPatchSchema` — the six tracked combat columns.
Name, class, race, level, ability scores, max HP, AC, speed and known spells are all
immutable once the creation form is submitted.

The consequences at a table: a typo'd ability score is permanent, a misread class is
permanent, and levelling up is impossible. There is no delete to work around it either —
`deleteCharacter()` exists at `src/lib/db/characters.ts:101`, is exported, and is fully
tested at `src/lib/db/characters.test.ts:218-236`, but no `DELETE` handler is wired to it
and no UI calls it. It is dead code guarding a hole.

This is the largest gap between the app and a usable first session, and it blocks other
work: DND-015's own acceptance requires skill choices to be "settable without re-creating
the character", which needs an edit path to exist first.

Scope note: **level-up is deliberately not this ticket.** Changing `level` recomputes
proficiency bonus, hit points, spell slots and known spells against the class tables — that
is rules work with real depth and it is DND-032. This ticket is the plumbing: a general edit
path plus a delete, with `level` editable as a plain field. DND-032 then builds the guided
level-up flow on top.

## Acceptance

- [ ] A character's build fields can be edited after creation — at minimum name, class,
      race, level, ability scores, max HP, AC, speed, known spells
- [ ] Editing is reachable from the sheet in a way that does not require going back to the list
- [ ] `deleteCharacter()` is wired to a `DELETE` handler and reachable from the UI, with a
      confirmation step
- [ ] Edits are owner-scoped exactly as reads are — another user's character id stays
      indistinguishable from a missing one
- [ ] Validation matches the creation form's rules rather than duplicating them
- [ ] The sheet's "Spells are chosen when the character is created" dead-end copy
      (`src/components/characters/sheet/spell-list-card.tsx:89`) is updated to point at the
      edit path
- [ ] CI green

## Prompt

Make characters editable after creation in the D&D 5e Companion, and wire up delete.

Today `PATCH /api/characters/[id]` (`src/app/api/characters/[id]/route.ts:52`) accepts only
`combatPatchSchema` — the six live combat columns — so everything about a character's build
is write-once. A typo'd ability score cannot be corrected and a level cannot be changed.
`deleteCharacter()` at `src/lib/db/characters.ts:101` is written and tested but has no route
and no UI, so there is not even a delete-and-recreate workaround.

Build a general edit path. The validation rules already exist in
`src/lib/characters/schema.ts` and the creation form at
`src/components/characters/character-form.tsx` — reuse them rather than writing a second set;
a partial-update schema derived from the creation schema is likely the cleanest route. Keep
the existing ownership property: reads fold `ownerId` into the query so a foreign id 404s
rather than 403s, and edits must behave the same way.

Add a `DELETE` handler wired to the existing `deleteCharacter()`, with a confirmation step in
the UI — `alert-dialog` is already a dependency.

Two things explicitly **not** in this ticket. **Level-up** is DND-032: make `level` an
editable field here, but do not build recomputation of proficiency bonus, HP, spell slots or
known spells. And **the DM's right to edit other people's characters** is DND-027 — build
this owner-scoped, and let DND-027 replace the ownership predicate later.

While you are in the sheet, fix the dead-end copy at
`src/components/characters/sheet/spell-list-card.tsx:89` ("Spells are chosen when the
character is created"), which currently implies delete-and-recreate is the only option.

Read `.icm/intake/DND-018-edit-a-character.md` and `.icm/project.md` for context. Open a PR
on a `claude/` branch; do not run local checks — CI is the source of truth.
