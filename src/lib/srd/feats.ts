// The four SRD 5.2.1 Origin feats, local (`srd-2024-migration/srd-data-layer`).
//
// Scoped to Origin feats on purpose: these are the ones a background grants at
// level 1, which is what the creation flow needs. General feats, Fighting Style
// feats and Epic Boons arrive with the ASI/feat grants at levels 4/8/12/16/19
// and belong to `srd-2024-migration/asi-and-feats`.
import data from './data/origin-feats.json'
import { collection } from './lookup'
import type { SrdOriginFeat } from './types'

export const ORIGIN_FEATS = collection(data as SrdOriginFeat[])
