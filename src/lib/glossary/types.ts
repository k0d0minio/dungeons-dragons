// The glossary's shape (`learn-to-play/glossary-popovers`).
//
// This is *not* SRD data and does not live in `src/lib/srd/`: every definition
// here is written in the app's own words for a player who has never held a
// character sheet, on the 2024 rules baseline. The SRD's own prose is the
// reference tier — `/rules/*` renders it verbatim — and this is the friendly
// tier above it, so nothing in `terms.ts` may be copied from a rulebook.

/** One glossary entry: what the word means, in two sentences. */
export interface GlossaryEntry {
  /** Lowercase slug, the value a component passes to look the term up. */
  index: string
  /** The term as it reads at the head of the popover — sentence case. */
  term: string
  /**
   * Two sentences, plain language: what it is, then the thing a beginner
   * actually gets wrong about it. Longer than that and it stops being a
   * popover; shorter and it is a dictionary entry rather than an explanation.
   */
  definition: string
  /**
   * Indexes of the terms a reader lands on next, resolved at render time.
   * Every index here must exist — `glossary.test.ts` asserts it — because a
   * dead "see also" chip is worse than no chip.
   */
  seeAlso?: readonly string[]
}
