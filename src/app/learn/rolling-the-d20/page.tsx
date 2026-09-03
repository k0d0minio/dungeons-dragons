import { LearnChapter } from '@/components/learn/learn-chapter'
import { loadLearnChapter } from '@/lib/learn/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other page (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Rolling the d20',
}

/** `docs/learn/03-rolling-the-d20.md` rendered in-app. */
export default async function RollingTheD20LearnPage() {
  const markdown = await loadLearnChapter('03-rolling-the-d20.md')

  return <LearnChapter markdown={markdown} slug="rolling-the-d20" />
}
