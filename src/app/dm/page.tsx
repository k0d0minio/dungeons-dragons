import { redirect } from 'next/navigation'

// Redirects on the session's role having already been checked by the layout.
export const dynamic = 'force-dynamic'

/**
 * `/dm` is a door, not a page (D48).
 *
 * It used to be the campaign list — the hub the whole DM side hung off, and
 * the thing D48 replaced with four stops that are about *when* in a game you
 * need something. The front door still sends the `dm` role here
 * (`first-table/dm-front-door`) and installed shortcuts and old links still
 * point at it, so it stays and forwards to Play: opening the app mid-session
 * should put the table in front of you.
 *
 * `dm-chronology/retire-the-hub` finishes the job the redirect starts.
 */
export default async function DmHomePage() {
  redirect('/dm/play')
}
