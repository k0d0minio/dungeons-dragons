import type { LearnChapterFile } from './load'

/**
 * The learn-to-play pages, in reading order (`learn-to-play/learn-chapters`).
 *
 * Six pages, not eleven: this is the friendly tier, read end to end in one
 * sitting before session 1, and a list long enough to scroll reads as homework.
 * The four in the middle are the syllabus the research picked out — the action
 * economy, what to roll and what to add, spell bookkeeping, and reading the
 * sheet — bracketed by what the game is and what an evening looks like.
 *
 * `slug` is the URL segment and part of the app's public surface once linked.
 */
export type LearnChapterMeta = {
  slug: string
  file: LearnChapterFile
  /** Page name as it reads in a list — matching the `# …` heading in the markdown. */
  title: string
  /** One line for the index card, written as a promise rather than a summary. */
  blurb: string
  /** Rough reading time, so the index is honest about what it is asking for. */
  minutes: number
}

export const LEARN_CHAPTERS: readonly LearnChapterMeta[] = [
  {
    slug: 'what-this-game-is',
    file: '01-what-this-game-is.md',
    title: 'What this game actually is',
    blurb: 'The whole loop in a page: someone describes a world, you say what you do.',
    minutes: 4,
  },
  {
    slug: 'your-turn',
    file: '02-your-turn.md',
    title: 'Your turn',
    blurb: 'Move, one action, maybe a bonus action, one reaction — and why they are not swappable.',
    minutes: 6,
  },
  {
    slug: 'rolling-the-d20',
    file: '03-rolling-the-d20.md',
    title: 'Rolling the d20',
    blurb: 'Checks, attacks and saves: which is which, what you add, and when proficiency counts.',
    minutes: 7,
  },
  {
    slug: 'casting-spells',
    file: '04-casting-spells.md',
    title: 'Casting spells',
    blurb: 'Cantrips, slots, what "prepared" means, and the one-at-a-time concentration rule.',
    minutes: 7,
  },
  {
    slug: 'reading-your-sheet',
    file: '05-reading-your-sheet.md',
    title: 'Reading your sheet',
    blurb: 'Where AC, initiative, your save DC and every other number on the screen came from.',
    minutes: 6,
  },
  {
    slug: 'at-the-table',
    file: '06-at-the-table.md',
    title: 'How a session works',
    blurb: 'What an evening looks like from the inside, and the habits that make one go well.',
    minutes: 5,
  },
]

/** The page's neighbours in reading order, for the foot of a page. */
export function learnChapterNeighbours(slug: string): {
  previous?: LearnChapterMeta
  next?: LearnChapterMeta
} {
  const index = LEARN_CHAPTERS.findIndex((chapter) => chapter.slug === slug)
  if (index === -1) return {}

  return { previous: LEARN_CHAPTERS[index - 1], next: LEARN_CHAPTERS[index + 1] }
}

/** How long the whole tier takes to read, for the index's one promise. */
export const LEARN_TOTAL_MINUTES = LEARN_CHAPTERS.reduce(
  (total, chapter) => total + chapter.minutes,
  0,
)
