import { CC_BY_URL, FAN_CONTENT_DISCLAIMER, SRD_ATTRIBUTION } from '@/lib/srd/attribution'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'D&D 5e Companion'

/**
 * Site-wide legal footer. The reference browser and the character sheet both
 * render verbatim SRD text to the public, and CC-BY 4.0 §3(a) requires the
 * attribution at the point of distribution — so this lives in the root layout
 * rather than on any one page (DND-017).
 *
 * Both notices are quoted verbatim — the SRD 5.2.1 attribution and WotC's Fan
 * Content Policy. Do not paraphrase either of them; see
 * `src/lib/srd/attribution.ts` for where the strings come from.
 *
 * The SRD 5.1 notice that used to sit beside this one is gone
 * (`srd-2024-migration/long-tail-reference-data`): the app no longer
 * distributes any 5.1 material now that the reference browser reads local
 * SRD 5.2.1 data and the dnd5eapi.co proxy is retired. CC-BY §3(a) is about the
 * material actually distributed, so the notice went in the same change that
 * stopped serving it — not before, and not after.
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
        {/* The licence URI, kept as its own sentence so the attribution above
            stays verbatim — CC-BY §3(a)(1)(vi) wants the link, and the SRD's
            own required wording does not carry one. */}
        <p>
          The Creative Commons Attribution 4.0 International License is available at{' '}
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
