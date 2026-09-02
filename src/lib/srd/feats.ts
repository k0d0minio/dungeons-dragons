// The seventeen SRD 5.2.1 feats, local (`srd-2024-migration/srd-data-layer`,
// completed by `srd-2024-migration/asi-and-feats`).
//
// One data module, four views. The 2024 rules give a character two feat-taking
// moments and they read the same list through different filters: a background
// grants an **Origin** feat at level 1, and an Ability Score Improvement level
// takes a **General** feat — or, at 19th, an **Epic Boon**. **Fighting Style**
// feats are neither: they come from a class feature, so they are published here
// for reference and never offered by the level planner.
import data from './data/feats.json'
import { collection } from './lookup'
import type { SrdFeat, SrdFeatCategory } from './types'

const ALL = data as SrdFeat[]

/** Every feat, whatever its category. */
export const FEATS = collection(ALL)

function categorised(category: SrdFeatCategory) {
  return collection(ALL.filter((feat) => feat.category === category))
}

/** The four Origin feats a 2024 background can grant. */
export const ORIGIN_FEATS = categorised('origin')

/** The General feats an ASI level can take — Ability Score Improvement and Grappler. */
export const GENERAL_FEATS = categorised('general')

/** The seven Epic Boons, taken at 19th level. */
export const EPIC_BOONS = categorised('epic-boon')

/** The four Fighting Style feats, granted by a class feature rather than a level. */
export const FIGHTING_STYLE_FEATS = categorised('fighting-style')

/**
 * The feat SRD 5.2.1 prints for the ability increase itself: +2 to one score or
 * +1 to two. 2024 made the Ability Score Improvement a feat like any other, so
 * "an ASI or a feat" is really "this feat or another one" — which is what lets
 * the level planner store both branches of the choice in one shape.
 */
export const ABILITY_SCORE_IMPROVEMENT_INDEX = 'ability-score-improvement'
