import { RulesChapter } from '@/components/rules/rules-chapter'
import { loadRulesChapter } from '@/lib/rules/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other chapter — see the note on `/rules/conditions` (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'DM guide',
}

/** `docs/rules/10-dm-guide.md` rendered in-app. */
export default async function DmGuideRulesPage() {
  const markdown = await loadRulesChapter('10-dm-guide.md')

  return <RulesChapter markdown={markdown} slug="dm-guide" />
}
