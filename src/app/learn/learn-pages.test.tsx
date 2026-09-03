import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { glossaryTerm } from '@/lib/glossary/glossary'
import { LEARN_CHAPTERS, learnChapterNeighbours } from '@/lib/learn/chapters'
import { loadLearnChapter } from '@/lib/learn/load'
import AtTheTablePage from './at-the-table/page'
import CastingSpellsPage from './casting-spells/page'
import LearnIndexPage from './page'
import ReadingYourSheetPage from './reading-your-sheet/page'
import RollingTheD20Page from './rolling-the-d20/page'
import WhatThisGameIsPage from './what-this-game-is/page'
import YourTurnPage from './your-turn/page'

/**
 * Every page component, keyed by the slug its registry entry carries. The
 * registry test below asserts this covers `LEARN_CHAPTERS` exactly, which is
 * what catches a page added to the list but never given a route.
 */
const PAGES: Record<string, () => Promise<React.JSX.Element>> = {
  'what-this-game-is': WhatThisGameIsPage,
  'your-turn': YourTurnPage,
  'rolling-the-d20': RollingTheD20Page,
  'casting-spells': CastingSpellsPage,
  'reading-your-sheet': ReadingYourSheetPage,
  'at-the-table': AtTheTablePage,
}

// The pages are async server components over files checked into the repo, so
// these tests render the real pages — what a beginner would actually read.

/** Every `[[index]]` / `[[index|words]]` token in a page, index half only. */
function tokensIn(markdown: string): string[] {
  return [...markdown.matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g)].map((match) => match[1])
}

describe('/learn', () => {
  it('lists every page in reading order', () => {
    render(<LearnIndexPage />)

    const list = screen.getByRole('list')
    const links = within(list).getAllByRole('link')
    expect(links).toHaveLength(LEARN_CHAPTERS.length)

    LEARN_CHAPTERS.forEach((chapter, position) => {
      expect(links[position]).toHaveAttribute('href', `/learn/${chapter.slug}`)
      expect(links[position]).toHaveTextContent(chapter.title)
    })
  })

  it('offers a single way in rather than six equal choices', () => {
    render(<LearnIndexPage />)

    expect(screen.getByRole('link', { name: 'Start reading' })).toHaveAttribute(
      'href',
      `/learn/${LEARN_CHAPTERS[0].slug}`,
    )
  })

  it('points at the reference tier for the exact wording', () => {
    render(<LearnIndexPage />)

    expect(screen.getAllByRole('link', { name: /rules/i }).length).toBeGreaterThan(0)
  })
})

describe('the page registry', () => {
  it.each(LEARN_CHAPTERS)('$slug loads $file', async ({ file }) => {
    await expect(loadLearnChapter(file)).resolves.toMatch(/^# \S/)
  })

  it('gives every listed page a route, and no route a page that is not listed', () => {
    expect(Object.keys(PAGES).sort()).toEqual(LEARN_CHAPTERS.map((c) => c.slug).sort())
  })

  it('has no duplicate slugs', () => {
    const slugs = LEARN_CHAPTERS.map((chapter) => chapter.slug)

    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('reports no neighbours for a slug that is not a page', () => {
    expect(learnChapterNeighbours('not-a-page')).toEqual({})
  })

  it('gives the first page a next but no previous', () => {
    const { previous, next } = learnChapterNeighbours(LEARN_CHAPTERS[0].slug)

    expect(previous).toBeUndefined()
    expect(next).toBe(LEARN_CHAPTERS[1])
  })

  it('gives the last page a previous but no next', () => {
    const last = LEARN_CHAPTERS[LEARN_CHAPTERS.length - 1]
    const { previous, next } = learnChapterNeighbours(last.slug)

    expect(previous).toBe(LEARN_CHAPTERS[LEARN_CHAPTERS.length - 2])
    expect(next).toBeUndefined()
  })

  it('titles each page as its markdown heading does', async () => {
    for (const chapter of LEARN_CHAPTERS) {
      const markdown = await loadLearnChapter(chapter.file)

      expect(markdown.split('\n')[0]).toBe(`# ${chapter.title}`)
    }
  })
})

describe('the content itself', () => {
  // A token whose index this build does not define renders as bare words with
  // no popover — a silent failure on a phone, so it fails here instead.
  it('has no glossary token that the glossary cannot answer', async () => {
    for (const chapter of LEARN_CHAPTERS) {
      const markdown = await loadLearnChapter(chapter.file)
      const dead = [...new Set(tokensIn(markdown))].filter((index) => glossaryTerm(index) === null)

      expect({ page: chapter.slug, dead }).toEqual({ page: chapter.slug, dead: [] })
    }
  })

  // The friendly tier exists to define its terms of art, so a page that
  // defines none of them has quietly stopped doing its job.
  it('wraps terms of art on every page', async () => {
    for (const chapter of LEARN_CHAPTERS) {
      const markdown = await loadLearnChapter(chapter.file)

      expect(tokensIn(markdown).length).toBeGreaterThan(3)
    }
  })

  // A heading is an anchor target; a popover trigger inside one is a control
  // in a link target, and it would put the heading's own id through the label.
  it('keeps tokens out of headings', async () => {
    for (const chapter of LEARN_CHAPTERS) {
      const markdown = await loadLearnChapter(chapter.file)
      const headings = markdown.split('\n').filter((line) => line.startsWith('#'))

      expect(headings.filter((line) => line.includes('[['))).toEqual([])
    }
  })
})

describe('a learn page', () => {
  // Rendered for real, from the markdown in the repo: a page whose prose trips
  // the renderer is a page that ships broken, and nothing else would catch it.
  it.each(LEARN_CHAPTERS)('$slug renders as its own page', async ({ slug, title }) => {
    render(await PAGES[slug]())

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    // Terms of art reach the page as tappable triggers, not as raw `[[…]]`.
    expect(screen.getAllByRole('button', { name: /^What is / }).length).toBeGreaterThan(0)
    expect(screen.queryByText(/\[\[/)).not.toBeInTheDocument()
  })

  it('opens the plain-language definition when a term is tapped', async () => {
    render(await YourTurnPage())

    const trigger = screen.getAllByRole('button', { name: 'What is Bonus action?' })[0]
    await userEvent.click(trigger)

    expect(await screen.findByRole('dialog')).toHaveTextContent(
      glossaryTerm('bonus-action')!.definition,
    )
  })

  it('links on to the next page and back to the previous one', async () => {
    render(await YourTurnPage())

    expect(screen.getByRole('link', { name: /What this game actually is/ })).toHaveAttribute(
      'href',
      '/learn/what-this-game-is',
    )
    expect(screen.getByRole('link', { name: /Rolling the d20/ })).toHaveAttribute(
      'href',
      '/learn/rolling-the-d20',
    )
  })

  it('always offers the reference tier and the rest of the pages', async () => {
    render(await YourTurnPage())

    expect(screen.getByRole('link', { name: 'All pages' })).toHaveAttribute('href', '/learn')
    expect(screen.getByRole('link', { name: 'Full rules' })).toHaveAttribute('href', '/rules')
  })

  it('sends the reader on to their character when the last page runs out', async () => {
    render(await AtTheTablePage())

    expect(screen.getByRole('link', { name: 'Your character' })).toHaveAttribute(
      'href',
      '/characters',
    )
  })
})
