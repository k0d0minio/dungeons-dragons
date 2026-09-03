import Link from 'next/link'

import { GlossaryTerm } from '@/components/glossary/glossary-term'
import { learnChapterNeighbours } from '@/lib/learn/chapters'
import { renderMarkdown } from '@/lib/rules/markdown'

const CHIP_CLASS =
  'inline-flex min-h-11 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

/**
 * Turns each `[[index|words]]` token in the markdown into a tappable
 * definition (`learn-to-play/learn-chapters`).
 *
 * The rules chapters could only offer a strip of key terms *above* the prose,
 * because their prose is SRD text rendered word-for-word and nothing may reach
 * inside it. These pages are the app's own writing, so the definition can sit
 * on the word itself — which is the whole reason this tier is written from
 * scratch rather than lifted.
 *
 * An index this build does not define falls back to its own words with no
 * trigger, the same fail-soft `GlossaryTerm` takes everywhere; the content
 * test is what stops a dead token reaching a phone in the first place.
 */
function renderTerm(index: string, label: string | undefined, key: number) {
  return (
    <GlossaryTerm key={key} index={index}>
      {label}
    </GlossaryTerm>
  )
}

/**
 * One learn-to-play page (`learn-to-play/learn-chapters`).
 *
 * Deliberately the same frame as `RulesChapter` — two chips up top, prose,
 * prev/next at the foot — because the two tiers are read on the same phone by
 * the same person, and a reader who moves between them should not have to
 * learn a second layout. What differs is where it points: a rules chapter
 * offers the reference browser, and a learn page offers the reference *tier*,
 * since "I want the exact wording of that" is the one thing this page will not
 * give you.
 *
 * Prev/next sit at the foot for the reason they do there too, with more force:
 * these six pages are meant to be read in order, front to back, and the link
 * that matters is the one you meet when you finish.
 */
export function LearnChapter({ markdown, slug }: { markdown: string; slug: string }) {
  const { previous, next } = learnChapterNeighbours(slug)

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <nav aria-label="Learn to play" className="mb-6 flex flex-wrap gap-2">
        <Link href="/learn" className={CHIP_CLASS}>
          All pages
        </Link>
        <Link href="/rules" className={CHIP_CLASS}>
          Full rules
        </Link>
      </nav>

      {/* `space-y-4` and nothing else: the prose carries its own rhythm, and
          the glossary triggers are inline text, so no wrapper may change the
          line box they sit in. */}
      <article className="space-y-4">{renderMarkdown(markdown, { term: renderTerm })}</article>

      {(previous || next) && (
        <nav
          aria-label="Nearby pages"
          className="mt-10 flex flex-wrap gap-2 border-t pt-6 sm:justify-between"
        >
          {previous ? (
            <Link href={`/learn/${previous.slug}`} className={CHIP_CLASS}>
              <span aria-hidden="true" className="mr-2">
                &larr;
              </span>
              {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/learn/${next.slug}`} className={CHIP_CLASS}>
              {next.title}
              <span aria-hidden="true" className="ml-2">
                &rarr;
              </span>
            </Link>
          )}
        </nav>
      )}

      {/* The last page has no "next", and finishing the tier with a dead end
          is the moment a new player is most ready to go and make somebody. */}
      {!next && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/characters" className={CHIP_CLASS}>
            Your character
          </Link>
        </div>
      )}
    </main>
  )
}
