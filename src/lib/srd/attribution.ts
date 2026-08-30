// The licence notices the app is required to display.
//
// One module rather than string literals in the footer, because the notice is
// also quoted in the repo README and a paraphrase in either place is a licence
// breach rather than a wording preference. The strings below are verbatim from
// their sources; do not edit them to fit a layout.

/** Where the SRD 5.2.1 is published. */
export const SRD_URL = 'https://www.dndbeyond.com/srd'

/** The CC-BY-4.0 licence deed the SRD 5.2.1 is released under. */
export const CC_BY_URL = 'https://creativecommons.org/licenses/by/4.0/legalcode'

/**
 * The attribution SRD 5.2.1 requires, verbatim, split at the URL so the footer
 * can make it a link without altering a character of the sentence.
 *
 * Source: SRD 5.2.1 §"Legal Information", and the wording recorded in
 * `.icm/docs/2026-08-29-first-campaign-research.md` §2.
 */
export const SRD_ATTRIBUTION = {
  before:
    'This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at ',
  url: SRD_URL,
  after:
    '. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License.',
} as const

/**
 * WotC's Fan Content Policy disclaimer, verbatim.
 *
 * Kept alongside the CC-BY notice because they cover different things: CC-BY
 * licenses the SRD *text*, and says nothing about the trademarks — "Dungeons &
 * Dragons" in the app's own name is fan use, not licensed use.
 */
export const FAN_CONTENT_DISCLAIMER =
  'is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.'
