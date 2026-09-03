# Learn to play — the friendly tier

> Purpose: the six short pages a friend reads on their phone at home, before session 1.
> Shipped as `/learn` (indexed at `/learn`, rendered by
> `src/components/learn/learn-chapter.tsx` from the markdown in this directory).

## What this is, and how it differs from `docs/rules/`

`docs/rules/` is the **reference tier**: SRD 5.2.1 prose, precise, complete, and rendered
verbatim. It is where you go with a question mid-session.

This is the **friendly tier** above it: six pages, warm and plain, aimed at somebody who
has never opened a rulebook and is not currently at a table. It is written to be read
end to end in half an hour, in one sitting, on a phone.

Two rules follow from that:

- **Original wording only.** Nothing here is copied or paraphrased from a rulebook —
  every sentence is this app's own, on the 2024 baseline (SRD 5.2.1, D31). That is what
  lets these files carry glossary tokens and an opinionated voice, neither of which the
  verbatim chapters may have.
- **Accurate, not exhaustive.** A page may leave a rule out; it may never state one
  wrongly. When a page is deliberately silent on an edge case, the reference chapter is
  one tap away and that is where the edge case lives.

The syllabus is the one the research picked out (`learn-to-play/learn-chapters`): the
action economy, what to roll and what to add, spell bookkeeping, reading the sheet — the
four things beginners reliably stumble on — bracketed by what the game is and what an
evening looks like.

## Glossary tokens

These pages may wrap a term of art in a tappable definition, written as
`[[index]]` or `[[index|the words as they read here]]`:

```
Only if something gives you a [[bonus-action|bonus action]].
```

The index is a key in `src/lib/glossary/terms.ts`. An index that does not exist there
renders as its own words with no popover, and `learn-pages.test.tsx` fails the build for
it — a dead token is caught in CI, never on a phone.

Keep tokens out of headings: the heading's `id` is its anchor, and a popover inside one
is a control in a link target.

## File map

Every file ships as a page. The chapter list that drives the routes is
`src/lib/learn/chapters.ts`, and the filename union that lets a page name a file is
`src/lib/learn/load.ts` — a new page is added to both.

| File                       | In app                      |
| -------------------------- | --------------------------- |
| `01-what-this-game-is.md`  | `/learn/what-this-game-is`  |
| `02-your-turn.md`          | `/learn/your-turn`          |
| `03-rolling-the-d20.md`    | `/learn/rolling-the-d20`    |
| `04-casting-spells.md`     | `/learn/casting-spells`     |
| `05-reading-your-sheet.md` | `/learn/reading-your-sheet` |
| `06-at-the-table.md`       | `/learn/at-the-table`       |
