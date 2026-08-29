import { RulesChapter } from '@/components/rules/rules-chapter'
import { loadRulesChapter } from '@/lib/rules/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other chapter — see the note on `/rules/conditions` (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Spellcasting',
}

/** `docs/rules/06-spellcasting.md` rendered in-app. */
export default async function SpellcastingRulesPage() {
  const markdown = await loadRulesChapter('06-spellcasting.md')

  return <RulesChapter markdown={markdown} slug="spellcasting" />
}
