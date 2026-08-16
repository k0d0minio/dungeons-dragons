// The tracker's pure rules (DND-031): turn order, the round stepper, and
// per-instance monster HP arithmetic. No fetch, no React — the same split as
// `src/lib/characters/combat.ts`, and for the same reason: the behaviour a DM
// relies on every few seconds for three hours is testable without a browser.

/** The two fields turn order is computed from. */
export interface InitiativeOrderable {
  initiative: number | null
  sortOrder: number
}

/**
 * Initiative descending; a combatant with no initiative yet sinks to the
 * bottom (flagged "no initiative" in the UI) rather than sorting as zero and
 * landing mid-order; ties and the unsorted tail keep insertion order.
 */
export function compareByInitiative(a: InitiativeOrderable, b: InitiativeOrderable): number {
  if (a.initiative === null && b.initiative === null) return a.sortOrder - b.sortOrder
  if (a.initiative === null) return 1
  if (b.initiative === null) return -1
  if (a.initiative !== b.initiative) return b.initiative - a.initiative
  return a.sortOrder - b.sortOrder
}

/** The encounter-level counters the Next turn button steps. */
export interface TurnState {
  round: number
  activeTurn: number
}

/**
 * Advance to the next combatant; past the last one, wrap to the top of the
 * order and count a new round. With nobody in the fight there is nothing to
 * step. `activeTurn` may exceed the count transiently (a combatant was
 * removed since it was set) — the wrap clamps that back to the top.
 */
export function advanceTurn(state: TurnState, combatantCount: number): TurnState {
  if (combatantCount <= 0) return state

  const next = state.activeTurn + 1
  if (next >= combatantCount) return { round: state.round + 1, activeTurn: 0 }
  return { ...state, activeTurn: next }
}

/** A d20, as the roll button throws it. */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1
}

/** The HP columns a monster instance owns (D17). */
export interface MonsterHitPoints {
  currentHitPoints: number | null
  temporaryHitPoints: number
  maxHitPoints: number | null
}

/**
 * Damage to a monster instance: temp HP soaks first, current stops at 0 —
 * the same rule `applyDamage` gives the sheet, restated for rows where HP is
 * nullable. Null HP (an untracked monster) is left untouched.
 */
export function monsterAfterDamage(
  monster: MonsterHitPoints,
  amount: number,
): { currentHitPoints: number | null; temporaryHitPoints: number } {
  if (monster.currentHitPoints === null) {
    return {
      currentHitPoints: null,
      temporaryHitPoints: monster.temporaryHitPoints,
    }
  }

  const damage = Math.max(0, Math.floor(amount))
  const absorbed = Math.min(monster.temporaryHitPoints, damage)

  return {
    currentHitPoints: Math.max(0, monster.currentHitPoints - (damage - absorbed)),
    temporaryHitPoints: monster.temporaryHitPoints - absorbed,
  }
}

/** Healing a monster instance, never above its maximum (999 when untracked). */
export function monsterAfterHealing(
  monster: MonsterHitPoints,
  amount: number,
): { currentHitPoints: number | null } {
  if (monster.currentHitPoints === null) return { currentHitPoints: null }

  const healing = Math.max(0, Math.floor(amount))
  const ceiling = monster.maxHitPoints ?? 999

  return { currentHitPoints: Math.min(ceiling, monster.currentHitPoints + healing) }
}
