// Build-time loader for the SRD rules chapters served in-app (DND-037).
//
// The chapters are checked into the repo under `docs/rules/`, so the pages
// that render them are static: `force-static` pages read the file once at
// build time and ship HTML, which also makes rules lookup work in a signal
// blackspot — the one thing the API-backed reference can never do.

import { promises as fs } from 'fs'
import path from 'path'

/** The two chapters DND-037 ships. The other nine stay on GitHub, per ticket. */
export type RulesChapterFile = '07-conditions.md' | '11-quick-reference.md'

export async function loadRulesChapter(file: RulesChapterFile): Promise<string> {
  return fs.readFile(path.join(process.cwd(), 'docs', 'rules', file), 'utf8')
}
