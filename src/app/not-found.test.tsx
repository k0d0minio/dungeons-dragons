import { render, screen } from '@testing-library/react'

import NotFound from './not-found'

// The `notFound()` calls across the character and DM pages all land here — and
// so does someone else's character id, by design (the owner-scoped query makes
// a foreign id indistinguishable from a dead one). So this page is asserted to
// stay generic: no echo of what was asked for, and a route back.
describe('NotFound', () => {
  it('says the page is missing, in the app’s own words', () => {
    render(<NotFound />)

    expect(screen.getByText('This page is not in the book.')).toBeInTheDocument()
  })

  it('offers a way back to the reference browser and the character', () => {
    render(<NotFound />)

    expect(screen.getByRole('link', { name: 'Reference browser' })).toHaveAttribute(
      'href',
      '/library',
    )
    expect(screen.getByRole('link', { name: 'Your character' })).toHaveAttribute(
      'href',
      '/characters',
    )
  })
})
