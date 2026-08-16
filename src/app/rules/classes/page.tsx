import { RulesChapter } from '@/components/rules/rules-chapter'
import { loadRulesChapter } from '@/lib/rules/load'

// Baked at build time from the repo's own markdown, and public by design like
// every other chapter — see the note on `/rules/conditions` (DND-053).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Classes',
}

/** `docs/rules/04-classes.md` rendered in-app. */
export default async function ClassesRulesPage() {
  const markdown = await loadRulesChapter('04-classes.md')

  return <RulesChapter markdown={markdown} slug="classes" />
}
