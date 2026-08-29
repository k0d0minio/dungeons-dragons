import { RulesChapter } from '@/components/rules/rules-chapter'
import { loadRulesChapter } from '@/lib/rules/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other chapter — see the note on `/rules/conditions` (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Combat',
}

/** `docs/rules/05-combat.md` rendered in-app. */
export default async function CombatRulesPage() {
  const markdown = await loadRulesChapter('05-combat.md')

  return <RulesChapter markdown={markdown} slug="combat" />
}
