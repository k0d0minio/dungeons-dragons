import { render, screen } from '@testing-library/react'
import { SiteFooter } from './site-footer'

describe('SiteFooter', () => {
  it('carries the SRD 5.1 attribution verbatim', () => {
    render(<SiteFooter />)

    expect(
      screen.getByText(
        /This work includes material taken from the System Reference Document 5\.1 \(“SRD 5\.1”\) by Wizards of the Coast LLC and available at/
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /The SRD 5\.1 is licensed under the Creative Commons Attribution 4\.0 International License available at/
      )
    ).toBeInTheDocument()
  })

  it('links the SRD and the CC-BY-4.0 licence', () => {
    render(<SiteFooter />)

    expect(
      screen.getByRole('link', {
        name: 'https://dnd.wizards.com/resources/systems-reference-document',
      })
    ).toHaveAttribute('href', 'https://dnd.wizards.com/resources/systems-reference-document')
    expect(
      screen.getByRole('link', { name: 'https://creativecommons.org/licenses/by/4.0/legalcode' })
    ).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/legalcode')
  })

  it('carries the Fan Content Policy disclaimer', () => {
    render(<SiteFooter />)

    expect(
      screen.getByText(
        /is unofficial Fan Content permitted under the Fan Content Policy\. Not approved\/endorsed by Wizards\. Portions of the materials used are property of Wizards of the Coast\. ©Wizards of the Coast LLC\./
      )
    ).toBeInTheDocument()
  })
})
