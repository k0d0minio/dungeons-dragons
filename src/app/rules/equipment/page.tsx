import { RulesChapter } from '@/components/rules/rules-chapter'
import { loadRulesChapter } from '@/lib/rules/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other chapter — see the note on `/rules/conditions` (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Equipment',
}

/** `docs/rules/08-equipment.md` rendered in-app. */
export default async function EquipmentRulesPage() {
  const markdown = await loadRulesChapter('08-equipment.md')

  return <RulesChapter markdown={markdown} slug="equipment" />
}
