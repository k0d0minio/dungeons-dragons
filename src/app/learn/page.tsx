import Link from 'next/link'

import { LEARN_CHAPTERS, LEARN_TOTAL_MINUTES } from '@/lib/learn/chapters'

// Static like the pages it lists, and behind the sign-in wall like every page
// (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Learn to play',
  description:
    'Six short pages that teach D&D from nothing — what the game is, your turn, the dice, spells, your sheet and a session.',
}

/**
 * The `/learn` index (`learn-to-play/learn-chapters`).
 *
 * The friendly tier's front door, and the one page in the app written for
 * somebody who has not decided yet whether they are going to enjoy this. So it
 * leads with what it costs — a number of minutes, stated up front — rather
 * than with what it covers: the reason a beginner does not read the rules is
 * never that the rules are missing.
 *
 * Same stacked full-width list as `/rules` for the same 320px reason, plus the
 * one thing that list does not need: a "start here" button, because six equal
 * cards give a nervous reader six decisions instead of none.
 */
export default function LearnIndexPage() {
  const [first] = LEARN_CHAPTERS

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <nav aria-label="Reference" className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/rules"
          className="bg-background hover:bg-accent focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          Full rules
        </Link>
      </nav>

      <h1 className="mb-2 text-2xl font-bold">Learn to play</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Never played D&amp;D? Start here. Six short pages, about {LEARN_TOTAL_MINUTES} minutes end
        to end, written for somebody who has never opened a rulebook — read them on the sofa before
        your first session, not at the table.
      </p>
      <p className="mb-6 text-sm text-muted-foreground">
        Any word with a dotted line under it opens a plain-language definition. Tap it whenever a
        term goes past you; nothing here expects you to already know one.
      </p>

      {first ? (
        <Link
          href={`/learn/${first.slug}`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mb-6 flex min-h-11 items-center justify-center rounded-md px-4 py-3 font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          Start reading
        </Link>
      ) : null}

      <ul className="space-y-2">
        {LEARN_CHAPTERS.map((chapter, position) => (
          <li key={chapter.slug}>
            <Link
              href={`/learn/${chapter.slug}`}
              className="hover:bg-accent focus-visible:ring-ring block rounded-md border px-4 py-3 focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-medium">
                  {/* Numbered because the order is the point — this tier is read
                      front to back, unlike the reference chapters it sits above. */}
                  <span className="text-muted-foreground mr-2 tabular-nums">{position + 1}</span>
                  {chapter.title}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {chapter.minutes} min
                </span>
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{chapter.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 border-t pt-6 text-sm text-muted-foreground">
        Want the exact rule rather than the friendly version?{' '}
        <Link href="/rules" className="underline underline-offset-4">
          The full rules
        </Link>{' '}
        are eleven chapters of the real thing, and they work with no signal at the table.
      </p>
    </main>
  )
}
