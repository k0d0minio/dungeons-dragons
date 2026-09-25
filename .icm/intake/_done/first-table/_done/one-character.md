# Stub: A player is their character

- feature-slug: one-character
- sequence: 4 of 17
- depends-on: none
- priority: P1
- size: S
- sources: `.icm/docs/2026-09-05-first-timer-audit.md` §B; Jamie, 2026-09-05: "1 user
  should be intrinsically linked to 1 character, I don't want players creating multiple
  characters just yet"; Q&A: UI only

Decided **UI-only**: hide the surface, keep the model. No unique index and no API
change — `POST /api/characters` still accepts a second character, deliberately: nobody
owns two today, and the DM's retire flow (`retire-a-character`) will need the next one
to be creatable. A unique index on `characters.owner_id` stays available as a one-line
additive migration if the rule should ever become a guarantee.

## Build

- `/characters` becomes the sheet: a player with one character is redirected to it
  (the front door already does this; the list page does not). No *New* button, no list.
  A player with none keeps the "Let's make your first character" card.
- The sheet header's "Your characters" back link goes.
- The join page (`join-campaign-form.tsx`) stops asking "Bring a character": the one
  character comes; a player with none is sent into the wizard as today (D36).
- `/characters/new` opened by a player who already owns a character redirects to their
  sheet.
- A player who somehow owns two (SQL, a future flow) still gets the list — the list
  component stays, reachable by nothing on the bar.

## Not here

The player's Delete card on the edit page stays until `retire-a-character` moves that
act to the DM (Jamie: only the DM retires one). Removing it first would leave a
wrong-class character with no way out before Thursday.

## Done looks like

Tests for the redirects, the join form's two states, and the wizard entry with a
character already owned.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/one-character.md` and the epic's `breakdown.md`. Build it on a
`claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the stub
into `.icm/intake/first-table/_done/` in the same PR.
