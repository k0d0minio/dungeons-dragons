// Looking a glossary term up (`learn-to-play/glossary-popovers`).
//
// The index map is built once at module load, like the SRD collections: a
// rules chapter renders a strip of key terms and a character sheet renders a
// dozen tappable labels on the same paint, and neither should walk the array
// to do it.
import { collection } from '@/lib/srd/lookup'

import { GLOSSARY_TERMS } from './terms'
import type { GlossaryEntry } from './types'

export type { GlossaryEntry }
export { GLOSSARY_TERMS }

/** Every term, in the order `terms.ts` lists them, plus `get`/`has`/`indexes`. */
export const GLOSSARY = collection(GLOSSARY_TERMS)

/**
 * The entry for an index, or `null` for a term this build does not define.
 *
 * `null` rather than a throw for the reason the SRD lookups give: a component
 * that names a term this build has not written yet should render its own words
 * as plain text, not take the page down. `GlossaryTerm` does exactly that.
 */
export function glossaryTerm(index: string): GlossaryEntry | null {
  return GLOSSARY.get(index)
}

/** The `seeAlso` chips as entries, skipping any index this build lost. */
export function relatedTerms(entry: GlossaryEntry): GlossaryEntry[] {
  return (entry.seeAlso ?? [])
    .map((index) => GLOSSARY.get(index))
    .filter((related): related is GlossaryEntry => related !== null)
}
