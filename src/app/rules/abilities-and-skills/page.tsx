import { RulesChapter } from '@/components/rules/rules-chapter'
import { loadRulesChapter } from '@/lib/rules/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other chapter — see the note on `/rules/conditions` (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Abilities & skills',
}

/** `docs/rules/02-abilities-and-skills.md` rendered in-app. */
export default async function AbilitiesAndSkillsRulesPage() {
  const markdown = await loadRulesChapter('02-abilities-and-skills.md')

  return <RulesChapter markdown={markdown} slug="abilities-and-skills" />
}
