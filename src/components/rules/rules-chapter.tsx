import Link from 'next/link'

import { KeyTerms } from '@/components/glossary/key-terms'
import { chapterKeyTerms } from '@/lib/glossary/chapter-terms'
import { renderMarkdown } from '@/lib/rules/markdown'
import { rulesChapterNeighbours } from '@/lib/rules/chapters'

const CHIP_CLASS =
  'inline-flex min-h-11 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

/**
 * One SRD rules chapter, rendered verbatim from its markdown (DND-037, DND-053).
 *
 * The prose is CC-BY SRD 5.2.1 text: it reaches the page word-for-word through
 * `renderMarkdown`, never paraphrased here. Chrome is limited to a chapter
 * switcher up top — back to the reference browser, up to the chapter index —
 * because mid-session the reader arrived with a question and the text is the
 * answer. Attribution is the site-wide footer (DND-017).
 *
 * The key-terms strip (`learn-to-play/glossary-popovers`) is the one thing
 * allowed between the switcher and the prose: the handful of words the chapter
 * assumes you already know, each opening a plain-language definition written by
 * this app. It sits *outside* the article because the article is verbatim SRD
 * text — the friendly tier goes beside the reference tier, never inside it.
 *
 * Prev/next sit at the *foot* rather than the head: with eleven chapters the
 * top of the page has to stay a fixed two chips, or the answer gets pushed
 * below the fold on a phone. Reading order only matters once you've hit the
 * bottom anyway.
 */
export function RulesChapter({ markdown, slug }: { markdown: string; slug: string }) {
  const { previous, next } = rulesChapterNeighbours(slug)

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <nav aria-label="Rules chapters" className="mb-6 flex flex-wrap gap-2">
        <Link href="/library" className={CHIP_CLASS}>
          Reference
        </Link>
        <Link href="/rules" className={CHIP_CLASS}>
          All rules
        </Link>
      </nav>
      <KeyTerms terms={chapterKeyTerms(slug)} />
      <article className="mt-6 space-y-4">{renderMarkdown(markdown)}</article>
      {(previous || next) && (
        <nav
          aria-label="Nearby chapters"
          className="mt-10 flex flex-wrap gap-2 border-t pt-6 sm:justify-between"
        >
          {previous ? (
            <Link href={`/rules/${previous.slug}`} className={CHIP_CLASS}>
              <span aria-hidden="true" className="mr-2">
                &larr;
              </span>
              {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/rules/${next.slug}`} className={CHIP_CLASS}>
              {next.title}
              <span aria-hidden="true" className="ml-2">
                &rarr;
              </span>
            </Link>
          )}
        </nav>
      )}
    </main>
  )
}
