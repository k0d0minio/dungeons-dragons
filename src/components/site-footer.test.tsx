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

  // The SRD 5.1 notice came out with the 2014 proxy
  // (`srd-2024-migration/long-tail-reference-data`): the app distributes no 5.1
  // material any more, and CC-BY §3(a) attributes what is actually distributed.
  // Asserted as an absence so that reintroducing 5.1 content without thinking
  // about the notice is a conversation rather than a silent licence breach.
  it('no longer carries the SRD 5.1 attribution', () => {
    render(<SiteFooter />)

    expect(screen.queryByText(/System Reference Document 5\.1/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', {
        name: 'https://dnd.wizards.com/resources/systems-reference-document',
      }),
    ).not.toBeInTheDocument()
  })

  it('links the CC-BY licence it names', () => {
    render(<SiteFooter />)

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
