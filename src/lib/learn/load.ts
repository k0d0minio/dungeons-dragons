// Build-time loader for the learn-to-play pages served in-app
// (`learn-to-play/learn-chapters`).
//
// Same shape as `src/lib/rules/load.ts` and for the same reasons: the pages
// are checked into the repo under `docs/learn/`, so a `force-static` page
// reads the file once at build time and ships HTML. That matters less here
// than it does for the reference chapters — these are read at home, not in a
// blackspot at a table — but a teaching page that needs a round trip to
// appear is a teaching page nobody finishes.

import { promises as fs } from 'fs'
import path from 'path'

/**
 * Every page in `docs/learn/`, minus its README.
 *
 * A new `NN-slug.md` is added here and to `LEARN_CHAPTERS` in `./chapters`,
 * which is what turns it into a page.
 */
export type LearnChapterFile =
  | '01-what-this-game-is.md'
  | '02-your-turn.md'
  | '03-rolling-the-d20.md'
  | '04-casting-spells.md'
  | '05-reading-your-sheet.md'
  | '06-at-the-table.md'

export async function loadLearnChapter(file: LearnChapterFile): Promise<string> {
  return fs.readFile(path.join(process.cwd(), 'docs', 'learn', file), 'utf8')
}
