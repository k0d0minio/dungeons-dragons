import { render, screen } from '@testing-library/react'

import { OnePageCard } from './one-page-card'

// The players' one page (`first-table/session-zero-one-pager`): paragraphs as
// the DM wrote them, or nothing at all.
describe('OnePageCard', () => {
  it('renders nothing while the DM has not written it', () => {
    expect(render(<OnePageCard body={null} />).container).toBeEmptyDOMElement()
    expect(render(<OnePageCard body={'   \n\n  '} />).container).toBeEmptyDOMElement()
  })

  it('renders each blank-line-separated block as its own paragraph', () => {
    render(
      <OnePageCard
        body={'The pitch — a lighthouse that should not be lit.\n\nPhones — face down.'}
      />,
    )

    expect(screen.getByText('The one page')).toBeInTheDocument()
    expect(screen.getByText('The pitch — a lighthouse that should not be lit.')).toBeInTheDocument()
    expect(screen.getByText('Phones — face down.')).toBeInTheDocument()
    expect(screen.getAllByText(/—/)).toHaveLength(2)
  })

  it('keeps the line breaks inside a paragraph', () => {
    render(<OnePageCard body={'How deadly —\nYou can die. Nobody will.'} />)

    expect(screen.getByText(/How deadly —/)).toHaveClass('whitespace-pre-line')
  })
})
