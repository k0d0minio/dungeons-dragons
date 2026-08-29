import { RulesChapter } from '@/components/rules/rules-chapter'
import { loadRulesChapter } from '@/lib/rules/load'

// The chapter is in git, so the page is baked at build time: no fetch, no
// database, nothing to go stale. It used to be public by design — but D34
// retired the public half, so `src/proxy.ts` denies by default and `/rules` is
// not one of its named exceptions. "What does restrained do" now needs an
// account, like everything else at this table (DND-037, DND-053, D34).
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

  return <RulesChapter markdown={markdown} slug="conditions" />
}
