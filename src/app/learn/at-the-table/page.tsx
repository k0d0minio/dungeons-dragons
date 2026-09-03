import { LearnChapter } from '@/components/learn/learn-chapter'
import { loadLearnChapter } from '@/lib/learn/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other page (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'How a session works',
}

/** `docs/learn/06-at-the-table.md` rendered in-app. */
export default async function AtTheTableLearnPage() {
  const markdown = await loadLearnChapter('06-at-the-table.md')

  return <LearnChapter markdown={markdown} slug="at-the-table" />
}
