import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { isLevelUpWaiting, levelsBehind } from '@/lib/campaigns/milestone'

/**
 * "Your DM says you are level 4" — the player's half of milestone levelling
 * (D35, `dm-run-suite/milestone-leveling`).
 *
 * **Derived, never stored.** There is no pending-level column and nothing to
 * clear: the band is the comparison `character.level < campaigns.milestone_level`
 * asked at render time, so it appears the moment the DM taps their card and
 * disappears the moment the player finishes the planner. Nothing has to
 * reconcile, and nothing can be left half-written.
 *
 * At the head of the sheet, above everything, because it is the one piece of
 * news a character ever has and the whole reason a player is opening the app
 * between sessions. It is a band rather than a card in a segment for the same
 * reason the welcome band is one: a player who has been told at the table that
 * they levelled will look for it before they look at anything else, and three
 * taps to find it reads as the app not having heard.
 *
 * It **offers**, it does not do. The link goes to the DND-032 planner, where
 * hit points, spells and resources are chosen one at a time — the app has never
 * levelled anybody up and does not start here. A character several levels
 * behind is offered *one* step, because that is what the planner takes.
 *
 * Renders nothing when there is no milestone, or when the character has
 * already taken it — which for every character outside a campaign is always.
 */
export function LevelUpWaitingBand({
  characterId,
  level,
  milestoneLevel,
}: {
  characterId: string
  level: number
  /** The level this character's table has called, or `null` for no milestone. */
  milestoneLevel: number | null
}) {
  if (!isLevelUpWaiting(level, milestoneLevel)) return null

  const behind = levelsBehind(level, milestoneLevel)

  return (
    <aside
      aria-label="A level is waiting"
      className="border-primary/30 bg-primary/5 mb-4 space-y-3 rounded-lg border p-4"
    >
      <div className="space-y-1">
        <p className="font-semibold">
          {behind === 1
            ? `Your DM says the party is level ${milestoneLevel}.`
            : `Your DM says the party is level ${milestoneLevel} — you have ${behind} levels to take.`}
        </p>
        <p className="text-muted-foreground text-sm">
          {/* The honest sentence: nothing has happened to the sheet yet, and
              the choices are the player's. Levelling up in 5e is a page of
              them, which is why this is a link and not a button that acts. */}
          You are still level {level}. Levelling up is a few choices — hit points, and what your
          class gives you at the next level — and they are yours to make, one level at a time.
        </p>
      </div>

      <Button asChild className="h-11">
        <Link href={`/characters/${characterId}/level`}>Level up to {level + 1}</Link>
      </Button>
    </aside>
  )
}
