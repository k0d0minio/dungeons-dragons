// Build-time loader for the SRD rules chapters served in-app (DND-037, DND-053).
//
// The chapters are checked into the repo under `docs/rules/`, so the pages
// that render them are static: `force-static` pages read the file once at
// build time and ship HTML, which also makes rules lookup work in a signal
// blackspot — the one thing the API-backed reference can never do.

import { promises as fs } from 'fs'
import path from 'path'

/**
 * Every chapter in `docs/rules/`. DND-053 shipped the whole playbook, so this
 * union is the directory listing minus its README — a new `NN-slug.md` chapter
 * is added here and to `RULES_CHAPTERS` in `./chapters`, which is what turns it
 * into a page.
 */
export type RulesChapterFile =
  | '01-core-mechanics.md'
  | '02-abilities-and-skills.md'
  | '03-character-creation.md'
  | '04-classes.md'
  | '05-combat.md'
  | '06-spellcasting.md'
  | '07-conditions.md'
  | '08-equipment.md'
  | '09-adventuring.md'
  | '10-dm-guide.md'
  | '11-quick-reference.md'

export async function loadRulesChapter(file: RulesChapterFile): Promise<string> {
  return fs.readFile(path.join(process.cwd(), 'docs', 'rules', file), 'utf8')
}
