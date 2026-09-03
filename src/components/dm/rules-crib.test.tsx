import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CRIB_SECTIONS, type CribSection } from '@/lib/dm/crib'

import { RulesCrib } from './rules-crib'

// What reaches the screen (`dm-run-suite/dm-rules-crib`). The content itself is
// `crib.test.ts`'s; this asserts the four block shapes render, that every stop
// is one tap from the chip row, and that a term with a glossary entry is
// tappable while one without still reads as a label.

const FIXTURE: readonly CribSection[] = [
  {
    id: 'ruling',
    chip: 'Can I…?',
    title: 'They try something you have no rule for',
    blocks: [
      { kind: 'steps', steps: ['Say yes if it obviously works.', 'Otherwise pick a DC.'] },
      {
        kind: 'ladder',
        title: 'The DC ladder',
        rungs: [
          { value: '10', label: 'Easy' },
          { value: '15', label: 'Medium' },
        ],
      },
      { kind: 'note', text: 'When in doubt it is 15.' },
    ],
  },
  {
    id: 'turn',
    chip: 'Their turn',
    title: 'It is their turn — what do they get?',
    blocks: [
      {
        kind: 'entries',
        title: 'The budget',
        entries: [
          { label: 'Reaction', term: 'reaction', detail: 'One per round, back on their turn.' },
          { label: 'Object interaction', detail: 'One free: draw a weapon, open a door.' },
        ],
      },
    ],
  },
]

describe('RulesCrib', () => {
  it('offers every stop as a chip pointing at that section', () => {
    render(<RulesCrib sections={FIXTURE} />)

    const nav = screen.getByRole('navigation', { name: 'Jump to' })
    expect(within(nav).getByRole('link', { name: 'Can I…?' })).toHaveAttribute('href', '#ruling')
    expect(within(nav).getByRole('link', { name: 'Their turn' })).toHaveAttribute('href', '#turn')
  })

  it('heads each section with its moment at the table, at the anchor the chip names', () => {
    const { container } = render(<RulesCrib sections={FIXTURE} />)

    const heading = screen.getByRole('heading', {
      level: 2,
      name: 'They try something you have no rule for',
    })
    expect(heading).toBeInTheDocument()
    expect(container.querySelector('#ruling')).toContainElement(heading)
  })

  it('renders steps in order, the ladder as numbers, and a note as prose', () => {
    render(<RulesCrib sections={FIXTURE} />)

    expect(screen.getByText('Say yes if it obviously works.')).toBeInTheDocument()
    expect(screen.getByText('Otherwise pick a DC.')).toBeInTheDocument()

    expect(screen.getByText('The DC ladder')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Easy')).toBeInTheDocument()

    expect(screen.getByText('When in doubt it is 15.')).toBeInTheDocument()
  })

  it('prints a row as label then answer', () => {
    render(<RulesCrib sections={FIXTURE} />)

    expect(screen.getByText('Object interaction')).toBeInTheDocument()
    expect(screen.getByText(/One free: draw a weapon/)).toBeInTheDocument()
    expect(screen.getByText('The budget')).toBeInTheDocument()
  })

  it('makes a row whose term the glossary defines tappable, and leaves the rest as text', async () => {
    render(<RulesCrib sections={FIXTURE} />)

    const trigger = screen.getByRole('button', { name: 'What is Reaction?' })
    expect(trigger).toHaveTextContent('Reaction')
    // The label with no glossary term is not a control at all.
    expect(
      screen.queryByRole('button', { name: /What is Object interaction/ }),
    ).not.toBeInTheDocument()

    await userEvent.click(trigger)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('defaults to the whole crib when nothing is passed', () => {
    render(<RulesCrib />)

    for (const section of CRIB_SECTIONS) {
      expect(screen.getByRole('link', { name: section.chip })).toHaveAttribute(
        'href',
        `#${section.id}`,
      )
      expect(screen.getByRole('heading', { level: 2, name: section.title })).toBeInTheDocument()
    }
  })
})
