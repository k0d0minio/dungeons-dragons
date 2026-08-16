import { RulesChapter } from '@/components/rules/rules-chapter'
import { loadRulesChapter } from '@/lib/rules/load'

// The chapter is in git, so the page is baked at build time: no fetch, no
// auth, readable in a basement with no signal. **Public by design** — this
// path is not in `src/proxy.ts`'s matcher and must not be added to it;
// "what does restrained do" needs no account (DND-037).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Conditions',
}

/**
 * `docs/rules/07-conditions.md` rendered in-app. Every `### <Condition>`
 * heading becomes an anchor whose id equals the dnd5eapi condition index
 * (`#blinded`, `#prone`, …), which is what the character sheet's
 * ConditionsCard links to.
 */
export default async function ConditionsRulesPage() {
  const markdown = await loadRulesChapter('07-conditions.md')

  return (
    <RulesChapter
      markdown={markdown}
      sibling={{ href: '/rules/quick-reference', label: 'Quick reference' }}
    />
  )
}
