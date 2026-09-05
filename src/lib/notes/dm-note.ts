// The shape of the DM's note on a character (`first-table/dm-character-notes`),
// as text: four headings the research named, written as lines a first-time
// DM fills in with prose rather than as eight fields that stop him.
//
// Pure, and shared by the card that seeds a new note and the close-session
// step that appends the night's answers under *Threads*
// (`first-table/between-sessions-questions`) — so what the DM reads next prep
// is one page, in the order he first saw it.

/** The four headings, in the order the note opens with them. */
export const DM_NOTE_HEADINGS = ['The player', 'Hooks', 'Ask next session', 'Threads'] as const

export type DmNoteHeading = (typeof DM_NOTE_HEADINGS)[number]

/** One line under each heading saying what goes there, for the first open. */
const HEADING_HINTS: Record<DmNoteHeading, string> = {
  'The player': 'What they want out of this, what they are nervous about, how their name is said.',
  Hooks: 'Their backstory in one line. Who they know among your NPCs.',
  'Ask next session': 'One question, for them alone.',
  Threads: 'What came up at the table that is theirs.',
}

/**
 * What a new note is seeded with: each heading on its own line, a hint under
 * it, and room to write. The hints are part of the text, and the DM deletes
 * them as he goes — they are not placeholders the app keeps redrawing.
 */
export const DM_NOTE_TEMPLATE = DM_NOTE_HEADINGS.map(
  (heading) => `${heading}\n${HEADING_HINTS[heading]}\n`,
).join('\n')

/**
 * The note with `block` added under `heading` — at the end of that heading's
 * section, before the next heading — or appended to the end when the heading
 * is not in the note (the DM may have rewritten the page). Idempotent: a
 * block the note already carries, character for character, is not added
 * twice, so the close-session step can be pressed again after a failure.
 */
export function appendUnderHeading(body: string, heading: DmNoteHeading, block: string): string {
  const trimmedBlock = block.trim()
  if (!trimmedBlock) return body
  if (body.includes(trimmedBlock)) return body

  const lines = body.split('\n')
  const start = lines.findIndex((line) => line.trim() === heading)

  if (start === -1) {
    const base = body.trimEnd()
    return `${base ? `${base}\n\n` : ''}${heading}\n${trimmedBlock}\n`
  }

  // The section runs to the next heading, or to the end.
  let end = lines.length
  for (let position = start + 1; position < lines.length; position += 1) {
    if ((DM_NOTE_HEADINGS as readonly string[]).includes(lines[position].trim())) {
      end = position
      break
    }
  }

  // Trailing blank lines belong between sections, not inside this one.
  let insertAt = end
  while (insertAt > start + 1 && lines[insertAt - 1].trim() === '') insertAt -= 1

  const before = lines.slice(0, insertAt)
  const after = lines.slice(insertAt)

  return [...before, trimmedBlock, ...after].join('\n')
}

/**
 * The night's answers for one character as the lines that go under
 * *Threads*, dated — the two questions the research recommends asking at the
 * end of every session, and the highlight. Empty when nothing was answered.
 */
export function sessionAnswersBlock(
  sessionDate: string,
  answers: { favouriteMoment?: string; wantsNext?: string; highlight?: string },
): string {
  const lines: string[] = []
  const favourite = answers.favouriteMoment?.trim()
  const wants = answers.wantsNext?.trim()
  const highlight = answers.highlight?.trim()

  if (highlight) lines.push(`${sessionDate} — Highlight: ${highlight}`)
  if (favourite) lines.push(`${sessionDate} — Favourite moment: ${favourite}`)
  if (wants) lines.push(`${sessionDate} — Wants next: ${wants}`)

  return lines.join('\n')
}
