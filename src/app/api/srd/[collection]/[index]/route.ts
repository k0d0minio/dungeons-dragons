// GET /api/srd/{collection}/{index} — one entry, in full.
//
// A miss is a 404 rather than an empty body: an index the SRD does not define
// is a bad request, and the caller's SWR hook shows the same "not found" state
// the proxy's 404 used to produce.
import type { NextRequest } from 'next/server'

import {
  SERVED_COLLECTIONS,
  isServedCollection,
  isValidIndex,
  referenceError,
  referenceJson,
} from '@/lib/srd/serve'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ collection: string; index: string }> },
) {
  const { collection, index } = await params

  if (!isServedCollection(collection)) {
    return referenceError(`Unknown collection "${collection}"`, 404)
  }

  if (!index || !isValidIndex(index)) {
    return referenceError('Invalid index', 400)
  }

  const entry = SERVED_COLLECTIONS[collection].get(index)
  if (!entry) {
    return referenceError(`No ${collection} entry "${index}"`, 404)
  }

  return referenceJson(entry)
}
