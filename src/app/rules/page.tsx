import Link from 'next/link'

import { RULES_CHAPTERS } from '@/lib/rules/chapters'

// Static like the chapters it lists, and public for the same reason (DND-053).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Rules',
  description: 'The SRD 5.1 rules chapters, readable offline once the page has loaded.',
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
          href="/"
          className="bg-background hover:bg-accent focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          Reference
        </Link>
      </nav>

      <h1 className="mb-2 text-2xl font-bold">Rules</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        The SRD 5.1 (2014) rules, one chapter per page. Every chapter is part of the app itself, so
        it still opens with no signal at the table.
      </p>

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
