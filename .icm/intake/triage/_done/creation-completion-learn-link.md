# Stub: the wizard has no completion screen to hand a new player on from

- lane: tweak
- found-by: learn-to-play/learn-chapters, 2026-09-03
- priority: P2
- size: S

`learn-to-play/learn-chapters` asked for the six teaching pages to be linked from the
wizard's completion screen — "your character is ready, here's how to play them". There
is no such screen. `CharacterWizard.onSubmit`
(`src/components/characters/wizard/character-wizard.tsx`) posts to `/api/characters` and
`router.push`es straight to `/characters/<id>`, deliberately: the comment there says a
new player should meet their character rather than a row about them, and that is
right.

So the link landed on the two surfaces that do exist — `/characters` and the head of
`/characters/new` — and the moment the ticket actually named went unserved. It is the
best moment in the app for it: someone who has just spent twenty minutes making a
person is, for about thirty seconds, more curious about how to play them than they will
be again before session 1.

What is missing is not a screen. It is one band on the sheet, shown only the first time
that character is opened — a line that names them, says the sheet is theirs now, and
offers `/learn`. Dismissed on tap, and never shown again for that character. Where the
"first time" flag lives is the open question: a `localStorage` key keyed by character id
is enough for one phone and costs no migration; a column would follow the player across
devices and probably is not worth a migration for a band they see once.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/creation-completion-learn-link.md`. The character wizard drops a
player straight onto their new sheet with nothing marking the moment. Add a
first-open-only welcome band to the character sheet — names the character, says the
sheet is theirs, links to `/learn` (the six learn-to-play pages) — dismissable, and
never shown again for that character. Decide and justify where the seen flag lives;
`localStorage` keyed by character id is the cheap answer. Do not add a screen between
the wizard and the sheet. PR on a `claude/` branch; CI green only.
