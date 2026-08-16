// Shared upstream helpers for the /api/dnd5e/* reference proxy.
// One place to define the cache window, the index guard, and the response shape,
// so all eleven route handlers cache identically.

import { NextResponse } from 'next/server'

const DND_API_BASE_URL = 'https://www.dnd5eapi.co/api'

// SRD 5.1 has not changed since 2014, so staleness is not a real risk here — the
// only thing a revalidation ever picks up is an upstream data correction. A day is
// generous enough to make repeat lookups free and short enough that a fix upstream
// lands within a session or two.
export const REFERENCE_REVALIDATE_SECONDS = 60 * 60 * 24 // 24 hours

// A week of stale-while-revalidate on top: if dnd5eapi.co is slow or down when an
// entry expires, the CDN keeps serving the last good copy instead of making someone
// at a table wait on a third party.
const REFERENCE_STALE_WHILE_REVALIDATE_SECONDS = 60 * 60 * 24 * 7 // 7 days

// Reference data is public and identical for everyone, so the CDN may serve it
// without invoking the function at all.
export const REFERENCE_CACHE_CONTROL = `public, s-maxage=${REFERENCE_REVALIDATE_SECONDS}, stale-while-revalidate=${REFERENCE_STALE_WHILE_REVALIDATE_SECONDS}`

// Upstream indexes are lowercase slugs ('fireball', 'adult-red-dragon'). Anything
// else is not a reference lookup: without this guard the [index] routes proxy any
// path on that host and give the cache an unbounded key space.
const INDEX_PATTERN = /^[a-z0-9-]+$/

export function isValidIndex(index: string): boolean {
  return INDEX_PATTERN.test(index)
}

// Generic fetch function with error handling.
//
// It reports nothing itself, deliberately: every caller is a route handler
// whose catch block already reports what it decided to do about the failure
// (DND-025). Logging here as well would put two events in Sentry for one
// upstream hiccup and make the quota a function of how many layers a call
// passes through.
export async function fetchFromDndApi(endpoint: string) {
  const response = await fetch(`${DND_API_BASE_URL}${endpoint}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'D&D-Companion-App/1.0',
    },
    next: { revalidate: REFERENCE_REVALIDATE_SECONDS },
  })

  if (!response.ok) {
    throw new Error(`D&D API error: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// A cacheable reference response.
export function referenceJson(data: unknown) {
  return NextResponse.json(data, {
    headers: { 'Cache-Control': REFERENCE_CACHE_CONTROL },
  })
}

// Errors are never cached — a bad gateway must not stick around for a day.
export function referenceError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}
