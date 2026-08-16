import { render, screen } from '@testing-library/react'

import OfflinePage from './page'

describe('offline fallback page (DND-048)', () => {
  it('says plainly that the companion needs a connection', () => {
    render(<OfflinePage />)

    expect(screen.getByRole('heading', { name: "You're offline" })).toBeInTheDocument()
    expect(screen.getByText(/needs a connection/)).toBeInTheDocument()
  })
})
