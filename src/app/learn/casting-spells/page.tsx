import { LearnChapter } from '@/components/learn/learn-chapter'
import { loadLearnChapter } from '@/lib/learn/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other page (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Casting spells',
}

/** `docs/learn/04-casting-spells.md` rendered in-app. */
export default async function CastingSpellsLearnPage() {
  const markdown = await loadLearnChapter('04-casting-spells.md')

  return <LearnChapter markdown={markdown} slug="casting-spells" />
}
