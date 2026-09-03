'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  nextMilestoneLevel,
  partyMilestoneStanding,
  isLevelUpWaiting,
} from '@/lib/campaigns/milestone'
import type { Character } from '@/lib/db/schema'
import { fetcher } from '@/lib/srd/hooks'

/** The same beat as the glance above it (D25), and the same SWR key. */
const REFRESH_INTERVAL_MS = 15_000

/**
 * The DM's milestone control (D35, `dm-run-suite/milestone-leveling`).
 *
 * The one thing this screen is for: at the end of a session the DM says "you
 * are level 4", and this is where that is said. **One button, one write, one
 * column** — no character is touched, and no player is levelled up by it.
 * `campaigns.milestone_level` is set, and every sheet below it derives the
 * prompt from a comparison (see `src/lib/campaigns/milestone.ts`). That is what
 * makes it safe on `neon-http`, which has no transactions: there is no
 * six-character loop here to half-apply.
 *
 * Three things are on the card, and no more:
 *
 * - **What level the party is on**, or that nobody has said yet.
 * - **The one button**, labelled with the level it will call — "The party
 *   reaches level 4" reads as the sentence the DM says out loud, where a `+`
 *   next to a number does not.
 * - **Who has taken it.** The write is instant and invisible, and what happens
 *   next is players opening their sheets over the following week; "4 of 6 have
 *   levelled up" is that week on one line. It rides the party glance's SWR key,
 *   so the count is live and costs no second request.
 *
 * Undo is a first-class control rather than a confirmation dialog, because the
 * mis-tap this card can suffer is a level called a session early — noticed
 * immediately, and mended by putting the number back. Nothing is lost either
 * way: a character who already walked the planner keeps the level they took,
 * since the milestone never wrote it.
 *
 * Optimistic like the gates form, and for the same reason: the number repaints
 * at once, a refusal puts it back and says so, and there is no Save button to
 * forget before handing the phone over.
 */
export function CampaignMilestoneCard({
  campaignId,
  milestoneLevel: initialMilestoneLevel,
  initialCharacters,
}: {
  campaignId: string
  /** The stored column, straight off the row — `null` is "no milestone set". */
  milestoneLevel: number | null
  /** The roster the server rendered, and the glance's fallback data. */
  initialCharacters: Character[]
}) {
  const [milestoneLevel, setMilestoneLevel] = useState(initialMilestoneLevel)
  const [saving, setSaving] = useState(false)

  // The glance's key, deliberately: SWR dedupes it, so the two cards share one
  // poll and the standing below is as live as the hit points above it.
  const { data } = useSWR<{ characters: Character[] }>(`/api/campaigns/${campaignId}`, fetcher, {
    refreshInterval: REFRESH_INTERVAL_MS,
    fallbackData: { characters: initialCharacters },
  })

  const party = data?.characters ?? initialCharacters
  const standing = partyMilestoneStanding(party, milestoneLevel)
  const next = nextMilestoneLevel(party, milestoneLevel)

  async function call(level: number | null) {
    if (saving) return

    const previous = milestoneLevel

    setMilestoneLevel(level)
    setSaving(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/milestone`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneLevel: level }),
      })

      if (!response.ok) {
        setMilestoneLevel(previous)
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'That did not save. Try again.')
        return
      }

      toast.success(
        level === null
          ? 'Milestones off. Nobody is being asked to level up.'
          : `Level ${level}. Your players will be asked to level up when their sheets refresh.`,
      )
    } catch {
      setMilestoneLevel(previous)
      toast.error('That did not save. Check your connection.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Levelling up</CardTitle>
        <CardDescription>
          {milestoneLevel === null
            ? 'Say when the party levels and every sheet asks its player to. No XP to add up.'
            : 'You said it; they take it at their own pace. Nothing here changes a character.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-2xl font-bold tabular-nums">
            {milestoneLevel === null ? (
              <span className="text-muted-foreground text-base font-normal">
                No level called yet
              </span>
            ) : (
              <>
                Level {milestoneLevel}
                <span className="text-muted-foreground ml-2 text-sm font-normal">the party</span>
              </>
            )}
          </p>

          {/* The standing, and only when there is a milestone to stand against.
              Before that it would be a count of nothing. */}
          {milestoneLevel === null ? null : (
            <p className="text-muted-foreground text-right text-xs">
              {standing.party === 0
                ? 'No characters on the roster yet.'
                : standing.waiting === 0
                  ? `All ${standing.party} have levelled up.`
                  : `${standing.levelled} of ${standing.party} have levelled up.`}
            </p>
          )}
        </div>

        {/* Who is still to do it, by name — the DM's actual question at the
            start of the next session is "whose sheet is still on 3". */}
        {standing.waiting > 0 ? (
          <p className="text-muted-foreground text-xs">
            Still to level up:{' '}
            {party
              .filter((character) => isLevelUpWaiting(character.level, milestoneLevel))
              .map((character) => character.name)
              .join(', ')}
          </p>
        ) : null}

        {next === null ? (
          <p className="text-muted-foreground text-sm">
            Level 20 — the top of the table. There is nothing left to call.
          </p>
        ) : (
          <Button
            type="button"
            className="h-11 w-full"
            disabled={saving}
            onClick={() => void call(next)}
          >
            The party reaches level {next}
          </Button>
        )}

        {/* Both repairs, small and quiet, and only once there is something to
            repair: put the number back, or stop using milestones entirely. */}
        {milestoneLevel === null ? null : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {milestoneLevel > 1 ? (
              <button
                type="button"
                className="text-muted-foreground text-xs underline-offset-4 hover:underline"
                disabled={saving}
                onClick={() => void call(milestoneLevel - 1)}
              >
                Back to level {milestoneLevel - 1}
              </button>
            ) : null}
            <button
              type="button"
              className="text-muted-foreground text-xs underline-offset-4 hover:underline"
              disabled={saving}
              onClick={() => void call(null)}
            >
              Stop levelling by milestone
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
