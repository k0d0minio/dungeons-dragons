import { LearnChapter } from '@/components/learn/learn-chapter'
import { loadLearnChapter } from '@/lib/learn/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other page (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Reading your sheet',
}

/** `docs/learn/05-reading-your-sheet.md` rendered in-app. */
export default async function ReadingYourSheetLearnPage() {
  const markdown = await loadLearnChapter('05-reading-your-sheet.md')

  return <LearnChapter markdown={markdown} slug="reading-your-sheet" />
}
