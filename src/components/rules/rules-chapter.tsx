import Link from 'next/link'

import { renderMarkdown } from '@/lib/rules/markdown'

const CHIP_CLASS =
  'inline-flex min-h-11 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

/**
 * One SRD rules chapter, rendered verbatim from its markdown (DND-037).
 *
 * The prose is CC-BY SRD 5.1 text: it reaches the page word-for-word through
 * `renderMarkdown`, never paraphrased here. Chrome is limited to a chapter
 * switcher up top — back to the reference browser, across to the sibling
 * chapter — because mid-session the reader arrived with a question and the
 * text is the answer. Attribution is the site-wide footer (DND-017).
 */
export function RulesChapter({
  markdown,
  sibling,
}: {
  markdown: string
  sibling: { href: string; label: string }
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <nav aria-label="Rules chapters" className="mb-6 flex flex-wrap gap-2">
        <Link href="/" className={CHIP_CLASS}>
          Reference
        </Link>
        <Link href={sibling.href} className={CHIP_CLASS}>
          {sibling.label}
        </Link>
      </nav>
      <article className="space-y-4">{renderMarkdown(markdown)}</article>
    </main>
  )
}
