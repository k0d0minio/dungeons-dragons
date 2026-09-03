import { render, screen } from '@testing-library/react'

import { renderMarkdown, slugifyHeading } from './markdown'

function renderDoc(markdown: string) {
  return render(<article>{renderMarkdown(markdown)}</article>)
}

describe('slugifyHeading', () => {
  it('matches the dnd5eapi condition indexes for condition headings', () => {
    expect(slugifyHeading('Blinded')).toBe('blinded')
    expect(slugifyHeading('Exhaustion')).toBe('exhaustion')
  })

  it('drops punctuation and collapses whitespace', () => {
    expect(slugifyHeading('07 — Conditions')).toBe('07-conditions')
    expect(slugifyHeading('The 15 conditions')).toBe('the-15-conditions')
    expect(slugifyHeading('Rules disputes: 20 fast answers')).toBe('rules-disputes-20-fast-answers')
  })
})

describe('renderMarkdown', () => {
  it('renders headings at three levels, each with an anchor id', () => {
    renderDoc('# Title\n\n## Section\n\n### Blinded\n')

    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toHaveAttribute('id', 'title')
    expect(screen.getByRole('heading', { level: 2, name: 'Section' })).toHaveAttribute(
      'id',
      'section',
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Blinded' })).toHaveAttribute(
      'id',
      'blinded',
    )
  })

  it('slugs a heading by its words, ignoring inline markup', () => {
    renderDoc('## Conditions — one line each (`API: /api/2014/conditions`)\n')

    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute(
      'id',
      'conditions-one-line-each-api-api2014conditions',
    )
  })

  it('joins consecutive lines into one paragraph', () => {
    renderDoc('First line\nsecond line.\n\nNext paragraph.\n')

    expect(screen.getByText('First line second line.')).toBeInTheDocument()
    expect(screen.getByText('Next paragraph.')).toBeInTheDocument()
  })

  it('renders underscore emphasis, which is what prettier writes', () => {
    const { container } = renderDoc('A spell of level 1 _or higher_.\n')

    expect(container.querySelector('em')).toHaveTextContent('or higher')
  })

  it('nests emphasis rather than printing the inner markers', () => {
    const { container } = renderDoc('**Not _quite_ the same.**\n')

    expect(container.querySelector('strong em')).toHaveTextContent('quite')
    expect(screen.queryByText(/_quite_/)).not.toBeInTheDocument()
  })

  it('keeps markers inside a code span out of the emphasis rules', () => {
    const { container } = renderDoc('The column is `hit_points_max`.\n')

    expect(container.querySelector('code')).toHaveTextContent('hit_points_max')
    expect(container.querySelector('em')).toBeNull()
  })

  it('renders bold, italic, bold-italic and code spans', () => {
    const { container } = renderDoc(
      'A **bold** word, an *italic* word, a ***named spell*** and `code`.\n',
    )

    expect(container.querySelector('strong')).toHaveTextContent('bold')
    expect(container.querySelector('em')).toHaveTextContent('italic')
    expect(container.querySelector('strong em')).toHaveTextContent('named spell')
    expect(container.querySelector('code')).toHaveTextContent('code')
  })

  it('renders unordered lists', () => {
    renderDoc('- first thing\n- second thing\n')

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('first thing')
  })

  it('renders ordered lists and keeps their numbering', () => {
    const { container } = renderDoc('4. fourth\n5. fifth\n')

    const list = container.querySelector('ol')
    expect(list).toHaveAttribute('start', '4')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders a pipe table without its separator row, scrollable sideways', () => {
    const { container } = renderDoc('| Cover | Effect |\n|---|---|\n| Half | +2 AC |\n')

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Cover' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '+2 AC' })).toBeInTheDocument()
    expect(screen.queryByText('---')).not.toBeInTheDocument()
    // Wide tables scroll in their own box, not the page (320px rule).
    expect(container.querySelector('table')?.parentElement).toHaveClass('overflow-x-auto')
  })

  it('renders blockquotes', () => {
    renderDoc('> **2024 note:** the rule changed.\n')

    const quote = screen.getByText(/the rule changed/).closest('blockquote')
    expect(quote).toBeInTheDocument()
    expect(quote?.querySelector('strong')).toHaveTextContent('2024 note:')
  })

  it('renders fenced code blocks verbatim, scrollable sideways', () => {
    const { container } = renderDoc('```\nAC = 10 + DEX mod\nInitiative = d20\n```\n')

    const pre = container.querySelector('pre')
    expect(pre).toHaveTextContent('AC = 10 + DEX mod')
    expect(pre).toHaveTextContent('Initiative = d20')
    expect(pre).toHaveClass('overflow-x-auto')
  })

  it('skips blank lines without emitting empty blocks', () => {
    const { container } = renderDoc('\n\nOnly paragraph.\n\n\n')

    expect(container.querySelectorAll('article > *')).toHaveLength(1)
  })
})

describe('glossary tokens', () => {
  const term = (index: string, label: string | undefined, key: number) => (
    <button key={key} type="button" data-index={index}>
      {label ?? index}
    </button>
  )

  it('leaves the token as literal text when no renderer is given', () => {
    // The `/rules` chapters are SRD text word-for-word: an unimplemented
    // syntax must survive to the page, never be rewritten behind the author.
    renderDoc('Only if something gives you a [[bonus-action|bonus action]].\n')

    expect(
      screen.getByText('Only if something gives you a [[bonus-action|bonus action]].'),
    ).toBeInTheDocument()
  })

  it('renders a token with its own words when it carries a label', () => {
    render(<article>{renderMarkdown('You get one [[reaction|reaction]].\n', { term })}</article>)

    const trigger = screen.getByRole('button', { name: 'reaction' })
    expect(trigger).toHaveAttribute('data-index', 'reaction')
  })

  it('passes no label through for a bare token, so the caller can name it', () => {
    render(<article>{renderMarkdown('Roll [[initiative]].\n', { term })}</article>)

    expect(screen.getByRole('button', { name: 'initiative' })).toHaveAttribute(
      'data-index',
      'initiative',
    )
  })

  it('renders tokens inside lists, tables and blockquotes', () => {
    render(
      <article>
        {renderMarkdown(
          '- a [[cantrip]]\n\n| Term | Note |\n|---|---|\n| [[speed]] | feet |\n\n> ends on a [[long-rest|long rest]]\n',
          { term },
        )}
      </article>,
    )

    expect(screen.getByRole('button', { name: 'cantrip' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'speed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'long rest' })).toBeInTheDocument()
  })

  it('keeps other inline markup working alongside a token', () => {
    const { container } = render(
      <article>{renderMarkdown('A **bold** [[turn|turn]] and `code`.\n', { term })}</article>,
    )

    expect(container.querySelector('strong')).toHaveTextContent('bold')
    expect(container.querySelector('code')).toHaveTextContent('code')
    expect(screen.getByRole('button', { name: 'turn' })).toBeInTheDocument()
  })

  it('finds a token nested inside emphasis', () => {
    render(<article>{renderMarkdown('**One [[action|action]].**\n', { term })}</article>)

    const trigger = screen.getByRole('button', { name: 'action' })
    expect(trigger.closest('strong')).not.toBeNull()
  })

  it('ignores a bracket pair that is not a term index', () => {
    render(<article>{renderMarkdown('See [[Note 4]] for the rest.\n', { term })}</article>)

    expect(screen.getByText('See [[Note 4]] for the rest.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('slugs a heading by the token words, not the index', () => {
    render(<article>{renderMarkdown('## Your [[turn|turn]]\n', { term })}</article>)

    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'your-turn')
  })
})
