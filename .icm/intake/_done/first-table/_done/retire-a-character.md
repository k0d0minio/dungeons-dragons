# Stub: The DM retires a character; the player makes the next one

- feature-slug: retire-a-character
- sequence: 10 of 17
- depends-on: dm-character-profile, one-character
- priority: P2
- size: M
- sources: `.icm/docs/2026-09-05-first-timer-research.md` §2 (a dead PC: last words,
  back in the game "as quickly as possible", the new one at party level "as if always
  there"); Q&A: only the DM can retire one

Today a player deletes their own character from the edit page
(`delete-character-card.tsx`) and the DM cannot delete anyone's — D13 grants "sees and
edits". Jamie's rule inverts that. The DM retires a character from the profile page: a
confirmed act that deletes the row (the cascade takes items, notes, the roster row and
combatant rows) and keeps the player's seat, so their front door is the wizard again and
the finished character attaches to the campaign (D36's loop). The player's Delete card
goes. `deleteCharacter` in `src/lib/db/characters.ts` grows the DM predicate (the
roster's campaign, `dm_user_id`) — the one place D13's boundary moves, and the register
should say so when it ships.

Left for later: a death flow (last words, a hireling card for the rest of the night).
Retire is the mechanism it will use.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/retire-a-character.md` and the epic's `breakdown.md`. Build it
on a `claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv`
the stub into `.icm/intake/first-table/_done/` in the same PR.
