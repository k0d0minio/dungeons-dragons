import type { PlanReadiness } from '@/lib/session-plans/readiness'
import { cn } from '@/lib/utils'

/**
 * The progress rail: one segment per step of a night's prep.
 *
 * Drawn from `readiness.steps` rather than from a literal eight, so the rail
 * on the Prep tab's hero and the rail at the top of the plan screen are the
 * same picture of the same rule and neither can drift.
 *
 * `aria-hidden` because the line beside it says the same thing in words — a
 * screen reader gets "3 of 8 steps ready", not eight list items.
 *
 * Its own module because two screens draw it now (`dm-chronology/prep-tab`'s
 * hero and `dm-chronology/eight-steps-plan`'s header), and `sessions-tab` is
 * the third.
 */
export function ProgressRail({ readiness }: { readiness: PlanReadiness }) {
  return (
    <div aria-hidden className="flex gap-1">
      {readiness.steps.map((step) => (
        <span
          key={step.key}
          className={cn('h-1.5 flex-1 rounded-full', step.ready ? 'bg-primary' : 'bg-muted')}
        />
      ))}
    </div>
  )
}
