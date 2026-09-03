import { LearnChapter } from '@/components/learn/learn-chapter'
import { loadLearnChapter } from '@/lib/learn/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other page (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Your turn',
}

/** `docs/learn/02-your-turn.md` rendered in-app. */
export default async function YourTurnLearnPage() {
  const markdown = await loadLearnChapter('02-your-turn.md')

  return <LearnChapter markdown={markdown} slug="your-turn" />
}
