import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DisclosureRow, ListNote, Section, ValueRow } from './inset-list'

// The primitive the DM's tabs are built from (`dm-chronology`). What it has to
// get right is small and load-bearing: a group is announced by one heading, a
// row that goes somewhere is a link or a button and says so with a chevron, and
// a row that only states something is not a control at all.

describe('Section', () => {
  it('announces the group with one heading', () => {
    render(
      <Section title="The fight">
        <ListNote>Nothing yet.</ListNote>
      </Section>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'The fight' })).toBeInTheDocument()
    expect(screen.getByText('Nothing yet.')).toBeInTheDocument()
  })
})

describe('DisclosureRow', () => {
  it('is a link when it goes somewhere', () => {
    render(<DisclosureRow label="The crypt" detail="Built" href="/dm/encounters/1" trailing="4" />)

    const link = screen.getByRole('link', { name: /The crypt/ })
    expect(link).toHaveAttribute('href', '/dm/encounters/1')
    expect(link).toHaveTextContent('Built')
    expect(link).toHaveTextContent('4')
  })

  it('is a button when it opens something in place', async () => {
    const user = userEvent.setup()
    const onClick = jest.fn()

    render(<DisclosureRow label="Reveal" onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: 'Reveal' }))
    expect(onClick).toHaveBeenCalled()
  })
})

describe('ValueRow', () => {
  it('states a value without pretending to be a control', () => {
    render(<ValueRow label="Milestone" value="Level 4" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Level 4')).toBeInTheDocument()
  })

  it('becomes a control when there is something behind it', async () => {
    const user = userEvent.setup()
    const onClick = jest.fn()

    render(
      <ValueRow label="Milestone" detail="Say it out loud" value="Level 4" onClick={onClick} />,
    )

    await user.click(screen.getByRole('button', { name: /Milestone/ }))
    expect(onClick).toHaveBeenCalled()
  })
})
