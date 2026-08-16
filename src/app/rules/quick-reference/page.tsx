import { RulesChapter } from '@/components/rules/rules-chapter'
import { loadRulesChapter } from '@/lib/rules/load'

// Baked at build time from the repo's own markdown; public by design, like
// `/rules/conditions` — see the note there (DND-037).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Quick reference',
}

/** `docs/rules/11-quick-reference.md` — the DM screen — rendered in-app. */
export default async function QuickReferenceRulesPage() {
  const markdown = await loadRulesChapter('11-quick-reference.md')

  return (
    <RulesChapter
      markdown={markdown}
      sibling={{ href: '/rules/conditions', label: 'Conditions' }}
    />
  )
}
