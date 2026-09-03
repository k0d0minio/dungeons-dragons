import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { GlossaryTerm } from './glossary-term'
import { KeyTerms } from './key-terms'

describe('GlossaryTerm', () => {
  it('renders the caller’s words, not the glossary’s, as the visible trigger', () => {
    render(<GlossaryTerm index="armour-class">AC</GlossaryTerm>)

    const trigger = screen.getByRole('button', { name: 'What is Armour Class (AC)?' })
    expect(trigger).toHaveTextContent('AC')
  })

  it('falls back to the term itself when given no words', () => {
    render(<GlossaryTerm index="cantrip" />)

    expect(screen.getByRole('button', { name: 'What is Cantrip?' })).toHaveTextContent('Cantrip')
  })

  it('opens the definition on tap', async () => {
    const user = userEvent.setup()
    render(<GlossaryTerm index="bonus-action">Bonus action</GlossaryTerm>)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'What is Bonus action?' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Bonus action')
    expect(dialog).toHaveTextContent(/not a spare action/i)
  })

  it('follows a "see also" chip without closing the sheet', async () => {
    const user = userEvent.setup()
    render(<GlossaryTerm index="advantage">Advantage</GlossaryTerm>)

    await user.click(screen.getByRole('button', { name: 'What is Advantage?' }))
    await user.click(screen.getByRole('button', { name: 'Disadvantage' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(/use the lower/i)
    // And back again: the chain runs both ways.
    await user.click(screen.getByRole('button', { name: 'Advantage' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(/use the higher/i)
  })

  it('shows the term it was opened on again after being closed on another', async () => {
    const user = userEvent.setup()
    render(<GlossaryTerm index="advantage">Advantage</GlossaryTerm>)

    await user.click(screen.getByRole('button', { name: 'What is Advantage?' }))
    await user.click(screen.getByRole('button', { name: 'Disadvantage' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'What is Advantage?' }))

    expect(screen.getByRole('dialog')).toHaveTextContent(/use the higher/i)
  })

  it('offers the "see also" chain under the definition', async () => {
    const user = userEvent.setup()
    render(<GlossaryTerm index="temporary-hit-points">Temp HP</GlossaryTerm>)

    await user.click(screen.getByRole('button', { name: 'What is Temporary hit points?' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Temporary hit points')
    expect(screen.getByRole('dialog')).toHaveTextContent('See also')
  })

  it('leaves an unknown term as plain readable words with no control', () => {
    render(<GlossaryTerm index="thaco">THAC0</GlossaryTerm>)

    expect(screen.getByText('THAC0')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('falls back to the index itself when an unknown term has no words either', () => {
    render(<GlossaryTerm index="thaco" />)

    expect(screen.getByText('thaco')).toBeInTheDocument()
  })

  it('carries a 44px touch target in either variant (NFR-002)', () => {
    render(
      <>
        <GlossaryTerm index="initiative">Init</GlossaryTerm>
        <GlossaryTerm index="speed" variant="chip" />
      </>,
    )

    // Inline: the hit area is a transparent overlay, so the word keeps its own
    // line height inside a sentence.
    expect(screen.getByRole('button', { name: 'What is Initiative?' }).className).toContain(
      'after:h-11',
    )
    // A chip is its own control and can simply be 44px tall.
    expect(screen.getByRole('button', { name: 'What is Speed?' }).className).toContain('min-h-11')
  })

  it('marks the trigger with its index, so a surface can be audited for terms', () => {
    render(<GlossaryTerm index="concentration">Concentration</GlossaryTerm>)

    expect(screen.getByRole('button', { name: 'What is Concentration?' })).toHaveAttribute(
      'data-glossary-term',
      'concentration',
    )
  })
})

describe('KeyTerms', () => {
  it('renders one chip per term under a Key terms heading', () => {
    render(<KeyTerms terms={['initiative', 'turn', 'action']} />)

    expect(screen.getByRole('region', { name: 'Key terms' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'What is Initiative?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'What is Turn?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'What is Action?' })).toBeInTheDocument()
  })

  it('drops a term the glossary does not define', () => {
    render(<KeyTerms terms={['initiative', 'thaco']} />)

    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('renders nothing at all when no term resolves', () => {
    const { container } = render(<KeyTerms terms={['thaco']} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for a chapter with no key terms', () => {
    const { container } = render(<KeyTerms terms={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
