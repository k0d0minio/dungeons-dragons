import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CONDITIONS } from '@/lib/characters/rules'
import { chapterKeyTerms } from '@/lib/glossary/chapter-terms'
import { glossaryTerm } from '@/lib/glossary/glossary'
import { RULES_CHAPTERS, rulesChapterNeighbours } from '@/lib/rules/chapters'
import { loadRulesChapter } from '@/lib/rules/load'
import ConditionsRulesPage from './conditions/page'
import QuickReferenceRulesPage from './quick-reference/page'
import RulesIndexPage from './page'

// The pages are async server components over files checked into the repo, so
// these tests render the real chapters — what a table would actually read.

describe('/rules', () => {
  it('lists every shipped chapter', () => {
    render(<RulesIndexPage />)

    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('link')).toHaveLength(RULES_CHAPTERS.length)

    for (const chapter of RULES_CHAPTERS) {
      expect(screen.getByRole('link', { name: new RegExp(chapter.title) })).toHaveAttribute(
        'href',
        `/rules/${chapter.slug}`,
      )
    }
  })

  it('links back to the reference browser', () => {
    render(<RulesIndexPage />)

    expect(screen.getByRole('link', { name: 'Reference' })).toHaveAttribute('href', '/library')
  })
})

describe('the chapter registry', () => {
  // The union in `load.ts` is what stops a page pointing at a file that isn't
  // there; this catches the other direction — a chapter listed on the index
  // whose markdown never made it into the repo.
  it.each(RULES_CHAPTERS)('$slug loads $file', async ({ file }) => {
    await expect(loadRulesChapter(file)).resolves.toMatch(/^# \d\d — /)
  })

  it('has no duplicate slugs', () => {
    const slugs = RULES_CHAPTERS.map((chapter) => chapter.slug)

    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('reports no neighbours for a slug that is not a chapter', () => {
    expect(rulesChapterNeighbours('not-a-chapter')).toEqual({})
  })

  it('gives the first chapter a next but no previous', () => {
    const { previous, next } = rulesChapterNeighbours(RULES_CHAPTERS[0].slug)

    expect(previous).toBeUndefined()
    expect(next).toBe(RULES_CHAPTERS[1])
  })
})

describe('/rules/conditions', () => {
  it('renders the chapter from docs/rules/07-conditions.md', async () => {
    render(await ConditionsRulesPage())

    expect(screen.getByRole('heading', { level: 1, name: '07 — Conditions' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Restrained' })).toBeInTheDocument()
    // A line of the verbatim chapter text, not a summary.
    expect(
      screen.getByText(
        'A condition lasts until its cause says it ends (duration, save, remover effect).',
      ),
    ).toBeInTheDocument()
  })

  it('carries an anchor id for every condition the sheet can link to', async () => {
    render(await ConditionsRulesPage())

    for (const condition of CONDITIONS) {
      expect(document.getElementById(condition.index)).toHaveTextContent(condition.label)
    }
  })

  it('links back to the reference browser and up to the chapter index', async () => {
    render(await ConditionsRulesPage())

    expect(screen.getByRole('link', { name: 'Reference' })).toHaveAttribute('href', '/library')
    expect(screen.getByRole('link', { name: 'All rules' })).toHaveAttribute('href', '/rules')
  })

  it('offers both neighbouring chapters in reading order', async () => {
    render(await ConditionsRulesPage())

    const nearby = screen.getByRole('navigation', { name: 'Nearby chapters' })
    expect(within(nearby).getByRole('link', { name: /Spellcasting/ })).toHaveAttribute(
      'href',
      '/rules/spellcasting',
    )
    expect(within(nearby).getByRole('link', { name: /Equipment/ })).toHaveAttribute(
      'href',
      '/rules/equipment',
    )
  })
})

describe('/rules/quick-reference', () => {
  it('renders the DM screen from docs/rules/11-quick-reference.md', async () => {
    render(await QuickReferenceRulesPage())

    expect(
      screen.getByRole('heading', { level: 1, name: '11 — Quick Reference (DM Screen)' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Actions in combat' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Death saves' })).toBeInTheDocument()
    // One of the lookup tables made it through as an actual table.
    expect(screen.getByRole('columnheader', { name: 'Cover' })).toBeInTheDocument()
    // …and the formula block as code.
    expect(screen.getByText(/Spell save DC\s+= 8 \+ proficiency bonus/)).toBeInTheDocument()
  })

  it('links back to the reference browser and up to the chapter index', async () => {
    render(await QuickReferenceRulesPage())

    expect(screen.getByRole('link', { name: 'Reference' })).toHaveAttribute('href', '/library')
    expect(screen.getByRole('link', { name: 'All rules' })).toHaveAttribute('href', '/rules')
  })

  it('is the last chapter, so it offers a previous but no next', async () => {
    render(await QuickReferenceRulesPage())

    const nearby = screen.getByRole('navigation', { name: 'Nearby chapters' })
    expect(within(nearby).getByRole('link', { name: /DM guide/ })).toHaveAttribute(
      'href',
      '/rules/dm-guide',
    )
    expect(within(nearby).getAllByRole('link')).toHaveLength(1)
  })
})

describe('the key-terms strip (learn-to-play/glossary-popovers)', () => {
  it('offers the chapter’s key terms above the prose', async () => {
    render(await ConditionsRulesPage())

    const strip = screen.getByRole('region', { name: 'Key terms' })
    const terms = chapterKeyTerms('conditions')
    expect(terms.length).toBeGreaterThan(0)

    for (const index of terms) {
      const entry = glossaryTerm(index)
      expect(entry).not.toBeNull()
      expect(within(strip).getByRole('button', { name: `What is ${entry!.term}?` })).toBeVisible()
    }
  })

  it('leaves the verbatim SRD article untouched', async () => {
    const { container } = render(await ConditionsRulesPage())

    // The strip is chrome beside the chapter, never a word wrapped inside it:
    // the article is CC-BY SRD 5.2.1 text and stays free of app controls.
    const article = container.querySelector('article')
    expect(article).not.toBeNull()
    expect(article!.querySelectorAll('[data-glossary-term]')).toHaveLength(0)
  })

  it('opens a plain-language definition on tap', async () => {
    const user = userEvent.setup()
    render(await ConditionsRulesPage())

    await user.click(screen.getByRole('button', { name: 'What is Exhaustion?' }))

    expect(screen.getByRole('dialog')).toHaveTextContent(glossaryTerm('exhaustion')!.definition)
  })

  it('gives a chapter exactly one strip', async () => {
    render(await QuickReferenceRulesPage())

    expect(screen.getAllByRole('region', { name: 'Key terms' })).toHaveLength(1)
  })
})
