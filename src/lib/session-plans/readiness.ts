// How far through prepping a night the DM is (`dm-chronology/prep-tab`).
//
// One pure function over a plan and its child rows, returning a step per
// section with whether it is written. The Prep tab's hero reads it for the
// progress rail and the "still to do" line; `dm-chronology/sessions-tab` will
// read the same function for a night's row, so the two can never disagree
// about whether Thursday is ready.
//
// **These are the five sections a plan has today, and they are the eight Lazy
// DM steps in waiting.** `dm-chronology/eight-steps-plan` is the stub that
// splits them: "review the characters" joins the front, and "the prep it leans
// on" becomes the three separate steps the book names — fantastic locations,
// important NPCs and monsters. Nothing that reads this needs to change when it
// does, because the rail is drawn from `steps.length` rather than from a
// literal five (or eight) written into a component.
import type { SessionPlanItemKind } from '@/lib/db/schema'

/** One section of a night's prep, and whether there is anything in it. */
export interface PlanStep {
  key: string
  /**
   * The section inside a sentence — "still to do: a strong start".
   *
   * There is no heading form here because nothing prints one yet: the rail is
   * `aria-hidden` and the line beside it is a sentence. The plan screen's eight
   * rows want headings, and `dm-chronology/eight-steps-plan` is where they get
   * written — from the same list, rather than beside it.
   */
  short: string
  ready: boolean
}

/** The rail and its arithmetic, in the order the sections are written in. */
export interface PlanReadiness {
  steps: PlanStep[]
  /** How many sections have something in them. */
  ready: number
  /** How many there are — five today, eight after `eight-steps-plan`. */
  total: number
}

/**
 * As much of a plan as the rule reads. `SessionPlanDetail` satisfies it.
 *
 * `kind` is `string` rather than `SessionPlanItemKind` because that is what
 * the stored row's type says — the column is `text` with a CHECK, and the
 * check is the database's. The two kinds are named below against the schema's
 * own constant, so a renamed kind is a compile error here rather than a step
 * that silently never goes green.
 */
export interface ReadablePlan {
  plan: { strongStart: string | null; treasure: string | null }
  items: readonly { kind: string }[]
  links: readonly unknown[]
}

/** The two kinds of line a plan owns, named once from the schema. */
const SCENE: SessionPlanItemKind = 'scene'
const SECRET: SessionPlanItemKind = 'secret'

/** Whitespace is not prep: a field of spaces is an empty field. */
function written(value: string | null): boolean {
  return (value ?? '').trim().length > 0
}

/**
 * The steps of one night's prep, each with whether it is done.
 *
 * Order is the order the Lazy DM writes them in, which is also the order the
 * plan screen renders — the strong start first because it is the one thing
 * said out loud before anything else happens.
 */
export function planReadiness({ plan, items, links }: ReadablePlan): PlanReadiness {
  const steps: PlanStep[] = [
    { key: 'strongStart', short: 'a strong start', ready: written(plan.strongStart) },
    { key: 'scenes', short: 'scenes', ready: items.some((item) => item.kind === SCENE) },
    { key: 'secrets', short: 'secrets', ready: items.some((item) => item.kind === SECRET) },
    { key: 'links', short: 'the prep it leans on', ready: links.length > 0 },
    { key: 'treasure', short: 'treasure', ready: written(plan.treasure) },
  ]

  return { steps, ready: steps.filter((step) => step.ready).length, total: steps.length }
}

/** How many names the "still to do" line prints before it starts counting. */
const NAMED = 3

/**
 * "a strong start, secrets and treasure" — what is left, as a DM would say it.
 *
 * Three names and then a tally, because this line sits under a title on a
 * phone: a night nothing has been written for would otherwise print every
 * section and push the row to four lines. Empty when there is nothing left,
 * and the hero says the night is ready instead.
 */
export function stillToDo({ steps }: PlanReadiness): string {
  const left = steps.filter((step) => !step.ready).map((step) => step.short)
  if (left.length === 0) return ''

  const named = left.slice(0, NAMED)
  const rest = left.length - named.length
  const parts = rest > 0 ? [...named, `${rest} more`] : named

  if (parts.length === 1) return parts[0]

  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}
