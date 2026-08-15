const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "D&D 5e Companion"

const SRD_URL = "https://dnd.wizards.com/resources/systems-reference-document"
const CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/legalcode"

/**
 * Site-wide legal footer. The reference browser and the character sheet both
 * render verbatim SRD 5.1 text to the public, and CC-BY 4.0 §3(a) requires the
 * attribution at the point of distribution — so this lives in the root layout
 * rather than on any one page (DND-017).
 *
 * Both notices are quoted verbatim: the first from the SRD 5.1 preamble, the
 * second from WotC's Fan Content Policy. Do not paraphrase either.
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-3 text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        <p>
          This work includes material taken from the System Reference Document 5.1
          (&ldquo;SRD 5.1&rdquo;) by Wizards of the Coast LLC and available at{" "}
          <a href={SRD_URL} className="underline underline-offset-2" rel="license noreferrer" target="_blank">
            {SRD_URL}
          </a>
          . The SRD 5.1 is licensed under the Creative Commons Attribution 4.0
          International License available at{" "}
          <a href={CC_BY_URL} className="underline underline-offset-2" rel="license noreferrer" target="_blank">
            {CC_BY_URL}
          </a>
          .
        </p>
        <p>
          {APP_NAME} is unofficial Fan Content permitted under the Fan Content Policy. Not
          approved/endorsed by Wizards. Portions of the materials used are property of
          Wizards of the Coast. &copy;Wizards of the Coast LLC.
        </p>
      </div>
    </footer>
  )
}
