// What the party has not been shown yet, across all three prep entities
// (`dm-chronology/play-tab`).
//
// The reveal switches already exist, one per prep screen. What did not exist
// was a way to reach them without walking to the roster the thing is on: a DM
// whose party has just met the innkeeper wants two taps, not a navigation into
// Prep, a scroll and a walk back. This module answers the one question that
// makes that possible — "what is still hidden?" — for the sheet on the Play
// tab.
//
// **The projection is the point.** Each statement names an id and a name and
// nothing else. A reveal row is a tap target with a label on it, and the
// secret half of an NPC — what he really wants, what he is lying about — has
// no reason to cross into a browser to render one. Selecting the whole row
// would work and would ship every secret in the campaign to the client; that
// is the habit `sessionPlanTargets` refused for the same reason, and this
// refuses it again.
import { and, asc, eq, isNull } from 'drizzle-orm'

import { getDb } from './client'
import { isRowId, runByDm } from './revealable'
import { campaignHandouts, campaignLocations, campaignNpcs } from './schema'

/** Which prep entity a hidden row is — the noun the reveal switch is given. */
export type HiddenRevealKind = 'npc' | 'location' | 'handout'

/** One thing the party cannot see yet, as the Play tab's sheet lists it. */
export interface HiddenReveal {
  kind: HiddenRevealKind
  id: string
  /** The NPC's or place's name, or the handout's title. Nothing behind it. */
  name: string
}

/**
 * Everything in `campaignId` that `dmUserId` has written and not revealed.
 *
 * NPCs, then places, then handouts — the order the party meets them in more
 * often than not, and the order the prep screens sit in. Each list is
 * alphabetical within its kind, because this is scanned with a finger while
 * somebody is talking.
 *
 * An empty array for a campaign this DM does not run, the same answer as one
 * with nothing hidden: the three statements each fold in `campaigns.dm_user_id`
 * through `runByDm`, so a foreign campaign id simply matches no rows.
 */
export async function listHiddenReveals(
  dmUserId: string,
  campaignId: string,
): Promise<HiddenReveal[]> {
  if (!isRowId(campaignId)) return []

  const [npcs, locations, handouts] = await Promise.all([
    getDb()
      .select({ id: campaignNpcs.id, name: campaignNpcs.name })
      .from(campaignNpcs)
      .where(
        and(
          eq(campaignNpcs.campaignId, campaignId),
          isNull(campaignNpcs.revealedAt),
          runByDm(campaignNpcs, dmUserId),
        ),
      )
      .orderBy(asc(campaignNpcs.name)),
    getDb()
      .select({ id: campaignLocations.id, name: campaignLocations.name })
      .from(campaignLocations)
      .where(
        and(
          eq(campaignLocations.campaignId, campaignId),
          isNull(campaignLocations.revealedAt),
          runByDm(campaignLocations, dmUserId),
        ),
      )
      .orderBy(asc(campaignLocations.name)),
    getDb()
      .select({ id: campaignHandouts.id, name: campaignHandouts.title })
      .from(campaignHandouts)
      .where(
        and(
          eq(campaignHandouts.campaignId, campaignId),
          isNull(campaignHandouts.revealedAt),
          runByDm(campaignHandouts, dmUserId),
        ),
      )
      .orderBy(asc(campaignHandouts.title)),
  ])

  return [
    ...npcs.map((row) => ({ kind: 'npc' as const, ...row })),
    ...locations.map((row) => ({ kind: 'location' as const, ...row })),
    ...handouts.map((row) => ({ kind: 'handout' as const, ...row })),
  ]
}

/**
 * "3 NPCs, 1 place and 2 handouts still hidden" — the reveal row's own line.
 *
 * Written here rather than in the component because it is the sentence the row
 * *is*, and a sentence with three plurals and an Oxford-less list in it is
 * worth a test. Empty string for nothing hidden; the row says its own thing
 * then, since "0 NPCs" is not a sentence anybody wants at a table.
 */
export function summariseHidden(hidden: readonly HiddenReveal[]): string {
  const counts: Record<HiddenRevealKind, number> = { npc: 0, location: 0, handout: 0 }
  for (const entry of hidden) counts[entry.kind] += 1

  const parts = [
    counts.npc > 0 ? `${counts.npc} ${counts.npc === 1 ? 'NPC' : 'NPCs'}` : null,
    counts.location > 0 ? `${counts.location} ${counts.location === 1 ? 'place' : 'places'}` : null,
    counts.handout > 0
      ? `${counts.handout} ${counts.handout === 1 ? 'handout' : 'handouts'}`
      : null,
  ].filter((part): part is string => part !== null)

  if (parts.length === 0) return ''

  const last = parts[parts.length - 1]
  const rest = parts.slice(0, -1)

  return `${rest.length > 0 ? `${rest.join(', ')} and ` : ''}${last} still hidden`
}
