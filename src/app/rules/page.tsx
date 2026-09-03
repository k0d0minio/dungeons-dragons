import Link from 'next/link'

import { RULES_CHAPTERS } from '@/lib/rules/chapters'

// Static like the chapters it lists, and behind the sign-in wall for the same
// reason they are (DND-053, and D34 for the wall).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Rules',
  description: 'The SRD 5.2.1 rules chapters, one chapter per page.',
}

/**
 * The `/rules` index (DND-053).
 *
 * Before this, the eleven chapters were reachable only through two homepage
 * chips and the ⓘ links on the sheet's ConditionsCard. It is a plain stacked
 * list of full-width tap targets rather than a grid: at 320px a two-column
 * grid turns every title into two lines, and a reader scanning for "the one
 * about resting" is reading titles, not scanning a layout.
 */
export default function RulesIndexPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <nav aria-label="Rules chapters" className="mb-6">
        <Link
          href="/library"
          className="bg-background hover:bg-accent focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          Reference
        </Link>
      </nav>

      <h1 className="mb-2 text-2xl font-bold">Rules</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        The 2024 rules (SRD 5.2.1), one chapter per page — the exact wording, not a summary.
      </p>

      {/* The way out, offered before the list rather than after it: somebody
          who has never played and opens "Rules" first is one scroll away from
          deciding this game is homework (`learn-to-play/learn-chapters`). */}
      <Link
        href="/learn"
        className="hover:bg-accent focus-visible:ring-ring mb-6 block rounded-md border border-dashed px-4 py-3 focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="block font-medium">Never played before?</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          Learn to play is six short pages in plain language — start there and come back here for
          the exact wording.
        </span>
      </Link>

      <ul className="space-y-2">
        {RULES_CHAPTERS.map((chapter) => (
          <li key={chapter.slug}>
            <Link
              href={`/rules/${chapter.slug}`}
              className="hover:bg-accent focus-visible:ring-ring block rounded-md border px-4 py-3 focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="block font-medium">{chapter.title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{chapter.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
