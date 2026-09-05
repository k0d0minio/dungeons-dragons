import { Badge } from '@/components/ui/badge'
import type { DifficultyBand, EncounterDifficulty } from '@/lib/encounters/budget'

/**
 * The live difficulty readout (`dm-prep-suite/encounter-builder`).
 *
 * The one number a DM building their first fight has no way to feel: what the
 * monsters they just added cost against the budget of the people who are
 * actually turning up. Presentational and pure — every judgement is made in
 * `@/lib/encounters/budget`, which is unit-tested; this file decides only how
 * to say it.
 *
 * Three things are said at once, deliberately, because the label alone is the
 * trap the ticket names: the **band**, the **spend against the three
 * thresholds**, and — past High — **how far past**, in words. A DM who reads
 * only the badge still gets the warning; a DM who reads the bar can see they
 * are 40 XP from Moderate and add one more goblin.
 */

/** What each band is called, and what it means at the table. */
const BAND_COPY: Record<DifficultyBand, { label: string; blurb: string }> = {
  empty: {
    label: 'No monsters yet',
    blurb: 'Add a stat block and this starts costing something.',
  },
  under: {
    label: 'Under Low',
    blurb: 'Barely a speed bump. Fine as a scene, not as a fight.',
  },
  low: {
    label: 'Low',
    blurb: 'They should win without much cost. Resources spent, nobody in danger.',
  },
  moderate: {
    label: 'Moderate',
    blurb: 'Someone will probably drop. The fight is in doubt for a round or two.',
  },
  high: {
    label: 'High',
    blurb: 'A real chance of a death. Save these for the moments that deserve them.',
  },
}

/**
 * Only High gets the alarming colour. `under` and `low` are the same quiet
 * badge on purpose — neither is a problem, and three shades of "fine" would
 * make the one shade that matters harder to spot.
 */
const BAND_VARIANT: Record<DifficultyBand, 'secondary' | 'default' | 'destructive'> = {
  empty: 'secondary',
  under: 'secondary',
  low: 'secondary',
  moderate: 'default',
  high: 'destructive',
}

const xp = (value: number) => value.toLocaleString('en-GB')

export function DifficultyReadout({
  difficulty,
  warnings = [],
}: {
  difficulty: EncounterDifficulty
  /**
   * The level-1 rails (`first-table/level-one-rails`), as
   * `levelOneWarnings` writes them — or nothing, which is the common case.
   */
  warnings?: readonly string[]
}) {
  const { band, budget, total, partySize, overHighBy } = difficulty

  // No party, no budget, no verdict. Saying "Low" against a budget of zero
  // would be a number that looks computed and is not.
  if (band === null) {
    return (
      <div className="rounded-md border border-dashed p-3">
        <p className="text-sm font-medium">No difficulty yet</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Tick who is turning up and this prices the fight against them.
        </p>
      </div>
    )
  }

  const copy = BAND_COPY[band]

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Badge variant={BAND_VARIANT[band]} className="text-sm">
          {copy.label}
        </Badge>
        <p className="text-muted-foreground text-sm tabular-nums">
          {xp(total)} XP · {partySize} {partySize === 1 ? 'character' : 'characters'}
        </p>
      </div>

      <p className="text-muted-foreground text-sm">{copy.blurb}</p>

      <BudgetBar total={total} budget={budget} />

      {/* Past High is where the 2024 table stops describing anything, so this
          is the one place the readout raises its voice. It is a warning, never
          a block — a DM who means to run a deadly fight is allowed to. */}
      {overHighBy > 0 ? (
        <p role="alert" className="text-destructive text-sm font-medium">
          {xp(overHighBy)} XP past a High fight. Beyond this the budget stops describing anything —
          expect a death, or give the party a way out.
        </p>
      ) : null}

      {/* Level 1 is the one level the budget under-describes: three goblins
          are "Under Low" for four level-1 characters and still the fight that
          kills one. These are words under the readout, never a block, and
          never an alert — the past-High line above keeps that register. */}
      {warnings.length > 0 ? (
        <div className="space-y-1 text-sm">
          <p className="font-medium">Level 1 is the danger zone:</p>
          {warnings.map((warning) => (
            <p key={warning} className="text-muted-foreground">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * The spend against the three thresholds.
 *
 * Scaled to the High budget, or to the spend when it has run past it, so an
 * over-budget fight visibly overflows its markers rather than pinning silently
 * at the end of the bar. Decorative — `aria-hidden`, with the same numbers
 * underneath it in text, because a bar is unreadable to a screen reader and
 * "600 / 900 / 1,600" is not.
 */
function BudgetBar({ total, budget }: { total: number; budget: EncounterDifficulty['budget'] }) {
  const scale = Math.max(budget.high, total, 1)
  const percent = (value: number) => `${Math.min(100, (value / scale) * 100)}%`

  return (
    <div className="space-y-1.5">
      <div aria-hidden className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
        <div className="bg-foreground/70 h-full rounded-full" style={{ width: percent(total) }} />
        {(['low', 'moderate', 'high'] as const).map((threshold) => (
          <span
            key={threshold}
            className="bg-background/80 absolute inset-y-0 w-px"
            style={{ left: percent(budget[threshold]) }}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-xs tabular-nums">
        Budget: Low {xp(budget.low)} · Moderate {xp(budget.moderate)} · High {xp(budget.high)}
      </p>
    </div>
  )
}
