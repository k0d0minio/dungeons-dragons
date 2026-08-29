import { RulesChapter } from '@/components/rules/rules-chapter'
import { loadRulesChapter } from '@/lib/rules/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other chapter — see the note on `/rules/conditions` (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Adventuring',
}

/** `docs/rules/09-adventuring.md` rendered in-app. */
export default async function AdventuringRulesPage() {
  const markdown = await loadRulesChapter('09-adventuring.md')

  return <RulesChapter markdown={markdown} slug="adventuring" />
}
