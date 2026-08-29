import { render, screen } from '@testing-library/react'

import { PageHeader } from './page-header'

describe('PageHeader', () => {
  it('renders a large-title heading and subtitle', () => {
    render(<PageHeader title="Your characters" subtitle="Signed in as jamie" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Your characters' })).toBeInTheDocument()
    expect(screen.getByText('Signed in as jamie')).toBeInTheDocument()
  })

  it('links back with the given label', () => {
    render(<PageHeader title="New character" backHref="/characters" backLabel="Your characters" />)

    const back = screen.getByRole('link', { name: /Your characters/ })
    expect(back).toHaveAttribute('href', '/characters')
  })

  it('renders trailing actions', () => {
    render(<PageHeader title="DM" actions={<button type="button">Go</button>} />)

    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument()
  })

  it('defaults the back label to Back', () => {
    render(<PageHeader title="Encounter" backHref="/dm" />)

    expect(screen.getByRole('link', { name: /Back/ })).toHaveAttribute('href', '/dm')
  })
})
