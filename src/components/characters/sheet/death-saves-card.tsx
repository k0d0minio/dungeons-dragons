'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DEATH_SAVE_LIMIT,
  setDeathSaveFailures,
  setDeathSaveSuccesses,
  type CombatState,
} from '@/lib/characters/combat'
import { cn } from '@/lib/utils'

const MARKERS = Array.from({ length: DEATH_SAVE_LIMIT }, (_, offset) => offset + 1)

function SaveTrack({
  label,
  count,
  tone,
  onMark,
}: {
  label: string
  count: number
  tone: 'success' | 'failure'
  onMark: (position: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-1">
        {MARKERS.map((position) => {
          const marked = position <= count

          return (
            <Button
              key={position}
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 rounded-full"
              // Tapping the last marked circle clears it, so a mis-tap costs
              // one more tap rather than a reload.
              aria-label={`${marked ? 'Clear' : 'Mark'} ${label.toLowerCase()} ${position}`}
              aria-pressed={marked}
              onClick={() => onMark(position)}
            >
              <span
                className={cn(
                  'size-6 rounded-full border-2 transition-colors',
                  marked
                    ? tone === 'success'
                      ? 'border-emerald-600 bg-emerald-500'
                      : 'border-destructive bg-destructive'
                    : 'border-muted-foreground/40'
                )}
              />
            </Button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * The death save track, shown only at 0 hit points (DND-009).
 *
 * It sits below the hit point card rather than beside it, so appearing when a
 * character drops does not move any control that was already on screen.
 * Healing clears both rows — that is `applyHealing`'s job, not this card's.
 */
export function DeathSavesCard({
  state,
  apply,
}: {
  state: CombatState
  apply: (transition: (state: CombatState) => CombatState) => void
}) {
  const stable = state.deathSaveSuccesses >= DEATH_SAVE_LIMIT
  const dead = state.deathSaveFailures >= DEATH_SAVE_LIMIT

  return (
    <Card className="border-destructive/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Death saves</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <SaveTrack
          label="Successes"
          tone="success"
          count={state.deathSaveSuccesses}
          onMark={(position) => apply((current) => setDeathSaveSuccesses(current, position))}
        />
        <SaveTrack
          label="Failures"
          tone="failure"
          count={state.deathSaveFailures}
          onMark={(position) => apply((current) => setDeathSaveFailures(current, position))}
        />
        <p className="text-muted-foreground pt-1 text-xs" role="status">
          {dead
            ? 'Three failures — your character is dead.'
            : stable
              ? 'Three successes — stable at 0 hit points, and no longer rolling.'
              : 'Roll at the start of each of your turns. Any healing clears the track.'}
        </p>
      </CardContent>
    </Card>
  )
}
