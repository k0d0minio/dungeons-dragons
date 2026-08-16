'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { awardExperience, setExperience, type CombatState } from '@/lib/characters/combat'
import { experienceProgress, formatExperience } from '@/lib/characters/experience'

/**
 * Experience points on the sheet (DND-055) — the read half's first card.
 *
 * Read-half content on purpose: XP is consulted between fights, not tapped
 * every turn, so it sits below the inventory rather than competing with hit
 * points for the top of the screen. It leads the read half rather than
 * trailing it because it is the one card there that ever has news.
 *
 * Three states, and the first one is the point:
 *
 * - **Not tracked** (`experience === null`) — most home tables level by
 *   milestone, and for them this card is a single muted line with a way in, not
 *   a zero pretending to be a score. Nothing else on the sheet mentions XP.
 * - **Tracked** — the total, what the next level costs, and how far along.
 * - **Level available** — XP has passed the next threshold. This *nudges*, with
 *   a link to the planner; it never moves `level` itself. Levelling in 5e is a
 *   page of choices, and the app does not get to make them (DND-032).
 */
export function ExperienceCard({
  characterId,
  level,
  state,
  apply,
}: {
  characterId: string
  level: number
  state: CombatState
  apply: (transition: (state: CombatState) => CombatState) => void
}) {
  const [award, setAward] = useState('')

  if (state.experience === null) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 pt-6">
          <div>
            <p className="text-sm font-medium">Experience</p>
            <p className="text-muted-foreground text-xs">
              Not tracked — levels come from the story.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0"
            onClick={() => apply((current) => setExperience(current, 0))}
          >
            Track XP
          </Button>
        </CardContent>
      </Card>
    )
  }

  const progress = experienceProgress(state.experience, level)

  /** Add what was typed — or subtract it, for an award tapped in twice. */
  function addExperience() {
    const amount = Number.parseInt(award.trim(), 10)
    setAward('')
    if (!Number.isFinite(amount) || amount === 0) return

    apply((current) => awardExperience(current, amount))
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Experience</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-2xl font-bold tabular-nums">
            {formatExperience(progress.experience)}
            <span className="text-muted-foreground ml-1 text-sm font-normal">XP</span>
          </p>
          <p className="text-muted-foreground text-right text-xs">
            {progress.nextThreshold === null ? (
              '20th level — the top of the table'
            ) : (
              <>
                {formatExperience(progress.remaining ?? 0)} to level {progress.earnedLevel + 1}
                <span className="block">at {formatExperience(progress.nextThreshold)} XP</span>
              </>
            )}
          </p>
        </div>

        {/* Measured against the level the XP has *earned*, not the one written
            on the sheet — a character sitting on an unspent level-up shows a
            bar filling towards the next one, not a full bar that has been full
            for three sessions. */}
        <div
          className="bg-muted h-2 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress.fraction * 100)}
          aria-label={`Progress through level ${progress.earnedLevel}`}
        >
          <div
            className="bg-primary h-full rounded-full transition-[width]"
            style={{ width: `${Math.round(progress.fraction * 100)}%` }}
          />
        </div>

        {progress.levelAvailable ? (
          <p className="bg-primary/10 rounded-lg px-3 py-2 text-sm">
            <span className="font-medium">Level {progress.earnedLevel} available.</span>{' '}
            <Link
              href={`/characters/${characterId}/level`}
              className="underline underline-offset-4"
            >
              Level up
            </Link>{' '}
            when the table says so — the app never does it for you.
          </p>
        ) : null}

        {/* Manual awards: XP for talking a hill giant out of a fight, or for a
            session the DM tallied on paper. The encounter tracker's award is
            the common path; this is the one that does not need a fight. */}
        <div className="flex items-end gap-2">
          <div className="grow space-y-1">
            <Label htmlFor={`award-xp-${characterId}`} className="text-xs">
              Add XP
            </Label>
            <Input
              id={`award-xp-${characterId}`}
              type="number"
              inputMode="numeric"
              className="h-11"
              placeholder="0"
              value={award}
              onChange={(event) => setAward(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addExperience()
                }
              }}
            />
          </div>
          <Button type="button" variant="outline" className="h-11" onClick={addExperience}>
            Add
          </Button>
        </div>

        <button
          type="button"
          className="text-muted-foreground text-xs underline-offset-4 hover:underline"
          onClick={() => apply((current) => setExperience(current, null))}
        >
          Stop tracking XP
        </button>
      </CardContent>
    </Card>
  )
}
