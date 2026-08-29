import { RulesChapter } from '@/components/rules/rules-chapter'
import { loadRulesChapter } from '@/lib/rules/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other chapter — see the note on `/rules/conditions` (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Character creation',
}

/** `docs/rules/03-character-creation.md` rendered in-app. */
export default async function CharacterCreationRulesPage() {
  const markdown = await loadRulesChapter('03-character-creation.md')

  return <RulesChapter markdown={markdown} slug="character-creation" />
}
