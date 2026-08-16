import { render, screen } from '@testing-library/react'

import { CONDITIONS } from '@/lib/characters/rules'
import ConditionsRulesPage from './conditions/page'
import QuickReferenceRulesPage from './quick-reference/page'

// The pages are async server components over files checked into the repo, so
// these tests render the real chapters — what a table would actually read.

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

  it('links back to the reference browser and across to the quick reference', async () => {
    render(await ConditionsRulesPage())

    expect(screen.getByRole('link', { name: 'Reference' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Quick reference' })).toHaveAttribute(
      'href',
      '/rules/quick-reference',
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

  it('links back to the reference browser and across to conditions', async () => {
    render(await QuickReferenceRulesPage())

    expect(screen.getByRole('link', { name: 'Reference' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Conditions' })).toHaveAttribute(
      'href',
      '/rules/conditions',
    )
  })
})
