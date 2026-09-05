# Stub: What the DM knows about a character, and never shows

- feature-slug: dm-character-notes
- sequence: 7 of 17
- depends-on: dm-character-profile
- priority: P1
- size: M
- sources: `.icm/docs/2026-09-05-first-timer-research.md` §3 (Kanka's "Only me &
  Admins" layer; Sly Flourish — what the player wants, one question per character per
  session, "What interesting story threads have come up based on the PCs?"); Jamie,
  2026-09-05: "annotate"

One additive migration: `character_dm_notes` — `character_id` primary key referencing
`characters` (cascade), `body text not null default ''`, timestamps. Keyed by the
character like `character_notes` (the player's private notes), so the two tables are a
pair with opposite readers: that one is owner-only, this one is DM-only, and the DM
predicate is `campaigns.dm_user_id` through the roster — never the roster's `role`. No
player query selects it and it is not on the sheet's type; the leak-proofing is the
selection, as with every DM-only column (D38).

One card on the profile page: a textarea with a Save button (the DM's pattern
everywhere else in prep), seeded on first open with the headings the research named —
*The player* (what they want out of this, what they are nervous about, how their name
is said), *Hooks* (backstory in one line, ties to NPCs), *Ask next session* (one
question), *Threads* (what came up at the table). Headings are text, not columns: a
first-time DM writes prose, and a form of eight fields is the thing that stops him.

## Decision left open — Jamie

Keying by character means a retired character takes its note with it. If the notes are
about the *player* more than the character, key by `(campaign_id, user_id)` instead.
One line on this stub before building.

> Decided (Jamie, 2026-09-05): **by character** — `character_dm_notes.character_id`, the
> pair of the player's `character_notes`. A retired character takes its note with it.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/dm-character-notes.md` and the epic's `breakdown.md`; the page
it lands on is `_done/dm-character-profile.md`. Build it on a `claude/` branch and open
a PR; CI is the only evidence. When it ships, `git mv` the stub into
`.icm/intake/first-table/_done/` in the same PR.
