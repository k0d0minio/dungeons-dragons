import { render, screen } from '@testing-library/react'
import { SiteFooter } from './site-footer'

describe('SiteFooter', () => {
  it('carries the SRD 5.2.1 attribution verbatim', () => {
    render(<SiteFooter />)

    expect(
      screen.getByText(
        /This work includes material from the System Reference Document 5\.2\.1 \(“SRD 5\.2\.1”\) by Wizards of the Coast LLC, available at/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /The SRD 5\.2\.1 is licensed under the Creative Commons Attribution 4\.0 International License\./,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://www.dndbeyond.com/srd' })).toHaveAttribute(
      'href',
      'https://www.dndbeyond.com/srd',
    )
  })

  // The 2014 proxy still serves SRD 5.1 spells, monsters and magic items, so the
  // 5.1 notice has to stay until that namespace is retired. This test is the
  // reminder: it fails the day someone drops the notice while the proxy is live.
  it('still carries the SRD 5.1 attribution while 5.1 material is served', () => {
    render(<SiteFooter />)

    expect(
      screen.getByText(
        /This work includes material taken from the System Reference Document 5\.1 \(“SRD 5\.1”\) by Wizards of the Coast LLC and available at/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'https://dnd.wizards.com/resources/systems-reference-document',
      }),
    ).toHaveAttribute('href', 'https://dnd.wizards.com/resources/systems-reference-document')
    expect(
      screen.getByRole('link', { name: 'https://creativecommons.org/licenses/by/4.0/legalcode' }),
    ).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/legalcode')
  })

  it('carries the Fan Content Policy disclaimer', () => {
    render(<SiteFooter />)

    expect(
      screen.getByText(
        /is unofficial Fan Content permitted under the Fan Content Policy\. Not approved\/endorsed by Wizards\. Portions of the materials used are property of Wizards of the Coast\. ©Wizards of the Coast LLC\./,
      ),
    ).toBeInTheDocument()
  })
})
