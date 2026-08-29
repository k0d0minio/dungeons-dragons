import { RulesChapter } from '@/components/rules/rules-chapter'
import { loadRulesChapter } from '@/lib/rules/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other chapter — see the note on `/rules/conditions` (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Core mechanics',
}

/** `docs/rules/01-core-mechanics.md` rendered in-app. */
export default async function CoreMechanicsRulesPage() {
  const markdown = await loadRulesChapter('01-core-mechanics.md')

  return <RulesChapter markdown={markdown} slug="core-mechanics" />
}
