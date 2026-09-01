// The SRD 5.2.1 feats a character can hold, local
// (`srd-2024-migration/srd-data-layer` and `srd-2024-migration/asi-and-feats`).
//
// Two scopes live here, split by when a character gets them:
//
// - **Origin feats** (`ORIGIN_FEATS`): the four a background grants at level 1,
//   which is what the creation flow needs.
// - **General feats** (`GENERAL_FEATS`): the ones a character may take at an ASI
//   level (4/8/12/16) in place of an ability score increase. The SRD carries
//   exactly two — `ability-score-improvement` (which is the ASI itself) and
//   `grappler`.
//
// Fighting Style feats and Epic Boons are not here: Fighting Styles belong to a
// class's Fighting Style feature, not the ASI picker, and Epic Boons arrive at
// level 19 as that level's class feature (see `asi-and-feats` in the intake).
import data from './data/origin-feats.json'
import generalData from './data/general-feats.json'
import { collection } from './lookup'
import type { SrdGeneralFeat, SrdOriginFeat } from './types'

export const ORIGIN_FEATS = collection(data as SrdOriginFeat[])
export const GENERAL_FEATS = collection(generalData as SrdGeneralFeat[])
