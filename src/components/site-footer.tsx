import { CC_BY_URL, FAN_CONTENT_DISCLAIMER, SRD_ATTRIBUTION } from '@/lib/srd/attribution'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'D&D 5e Companion'

// The 5.1 notice, and the URL it names, are the wording that SRD's own preamble
// requires. It is still here because the reference browser still proxies SRD 5.1
// spells, monsters and magic items from dnd5eapi.co — SRD 5.2.1 has no source
// for those yet — and CC-BY §3(a) is about the material actually distributed,
// not about which ruleset the app calls current. It comes out with the 2014
// proxy, in the ticket that retires it.
const SRD_51_URL = 'https://dnd.wizards.com/resources/systems-reference-document'

/**
 * Site-wide legal footer. The reference browser and the character sheet both
 * render verbatim SRD text to the public, and CC-BY 4.0 §3(a) requires the
 * attribution at the point of distribution — so this lives in the root layout
 * rather than on any one page (DND-017).
 *
 * All three notices are quoted verbatim: two SRD attributions and WotC's Fan
 * Content Policy. Do not paraphrase any of them. The SRD 5.2.1 wording is the
 * one the current data layer needs and leads accordingly; see
 * `src/lib/srd/attribution.ts` for where the strings come from.
 *
 * The URLs are printed in full for the same reason, which makes them 330px of
 * unbreakable text — wider than a 320px phone, and enough to put the whole
 * page into horizontal scroll. `break-all` lets them wrap without altering a
 * character of them (DND-022).
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-3 text-center text-xs leading-relaxed text-muted-foreground">
        <p>
          {SRD_ATTRIBUTION.before}
          <a
            href={SRD_ATTRIBUTION.url}
            className="underline underline-offset-2 break-all"
            rel="license noreferrer"
            target="_blank"
          >
            {SRD_ATTRIBUTION.url}
          </a>
          {SRD_ATTRIBUTION.after}
        </p>
        <p>
          This work includes material taken from the System Reference Document 5.1 (&ldquo;SRD
          5.1&rdquo;) by Wizards of the Coast LLC and available at{' '}
          <a
            href={SRD_51_URL}
            className="underline underline-offset-2 break-all"
            rel="license noreferrer"
            target="_blank"
          >
            {SRD_51_URL}
          </a>
          . The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License
          available at{' '}
          <a
            href={CC_BY_URL}
            className="underline underline-offset-2 break-all"
            rel="license noreferrer"
            target="_blank"
          >
            {CC_BY_URL}
          </a>
          .
        </p>
        <p>
          {APP_NAME} {FAN_CONTENT_DISCLAIMER}
        </p>
      </div>
    </footer>
  )
}
