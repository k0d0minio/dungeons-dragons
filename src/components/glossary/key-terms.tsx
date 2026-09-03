import { glossaryTerm } from '@/lib/glossary/glossary'

import { GlossaryTerm } from './glossary-term'

/**
 * The strip of tappable key terms at the head of a rules chapter
 * (`learn-to-play/glossary-popovers`).
 *
 * It sits above the chapter rather than inside it because the chapter's prose
 * is SRD 5.2.1 text rendered word-for-word (DND-037) and nothing may reach
 * into it to wrap a word. So the words a beginner needs before they can read
 * the page are offered beside it, in the app's own voice, and the SRD text
 * below is left exactly as it is.
 *
 * Renders nothing at all when no term resolves — an empty bordered box with a
 * heading is worse than no box.
 */
export function KeyTerms({ terms }: { terms: readonly string[] }) {
  const known = terms.filter((index) => glossaryTerm(index) !== null)
  if (known.length === 0) return null

  return (
    <section aria-labelledby="key-terms-heading" className="bg-muted/40 rounded-xl border p-3">
      {/* Labelled by a paragraph rather than a heading: the strip sits above
          the chapter's own `# …` h1, and a heading here would put the page's
          outline out of order. The region role is what makes it navigable. */}
      <p
        id="key-terms-heading"
        className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
      >
        Key terms
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {known.map((index) => (
          <GlossaryTerm key={index} index={index} variant="chip" />
        ))}
      </div>
    </section>
  )
}
