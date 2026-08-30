// GET /api/srd/{collection} — the list view of one SRD 5.2.1 collection.
//
// One handler for all four collections, because with the data local there is
// nothing left for a per-collection route to do: no upstream URL to build, no
// fetch to fail, no error to report. The registry in `@/lib/srd/serve` says
// which names are servable and what a row of each looks like.
import type { NextRequest } from 'next/server'

import {
  SERVED_COLLECTIONS,
  isServedCollection,
  listBody,
  referenceError,
  referenceJson,
  spellListForClass,
} from '@/lib/srd/serve'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> },
) {
  const { collection } = await params

  if (!isServedCollection(collection)) {
    return referenceError(`Unknown collection "${collection}"`, 404)
  }

  // `?class=wizard` narrows the spell list to that class's spells — what the
  // creation picker and the sheet's spell list ask for. It replaces the 2014
  // `/classes/{index}/spells` endpoint: a filter on a list, rather than a
  // second endpoint returning a different shape of the same rows.
  const classIndex = request.nextUrl.searchParams.get('class')
  if (collection === 'spells' && classIndex) {
    return referenceJson(listBody(spellListForClass(classIndex)))
  }

  return referenceJson(listBody(SERVED_COLLECTIONS[collection].list()))
}
