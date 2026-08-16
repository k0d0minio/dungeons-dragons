// What a fight is worth, and how it splits (DND-055).
//
// Pure, like `tracker.ts` beside it. Two steps that are deliberately separate
// functions: what the monsters add up to, and what each character walks away
// with. The first is the number DND-054 needs as well — encounter difficulty is
// that same sum weighed against the party's thresholds — so when that ticket
// lands it imports {@link totalMonsterExperience} from here rather than
// summing the monsters a second time.
//
// XP awards are *per character present*, not per player and not per character
// in the campaign: 5e divides the fight's value among the adventurers who were
// in it, which is exactly the set of PC rows on the tracker.

/** A combatant row as the award needs it: a monster's index, or a PC's id. */
export interface AwardableCombatant {
  monsterIndex: string | null
  characterId: string | null
}

/** What a fight came to, before anyone divides it. */
export interface EncounterExperience {
  /** Every monster instance's XP added up. */
  total: number
  /** How many PC rows are in the fight — what `total` divides by. */
  shares: number
  /** Each character's cut, rounded down. Zero when nobody is there to take it. */
  perCharacter: number
  /** Monster indexes whose XP could not be read — see below. */
  unknownIndexes: string[]
}

/**
 * Add up what the monsters in a fight are worth.
 *
 * Per *instance*, not per index: four goblins are four times fifty. The XP
 * itself comes from the reference API's monster detail, passed in as a map so
 * this stays pure and so one fetch serves both this and anything else reading
 * the same monsters.
 *
 * A monster the map has nothing for contributes nothing and is named in
 * `unknownIndexes` instead. That is a fetch that failed or a homebrew row, and
 * a silent zero in a number the DM is about to hand out would be worse than a
 * visible "couldn't read these" — the card says so, and the DM types over the
 * total.
 */
export function totalMonsterExperience(
  combatants: readonly AwardableCombatant[],
  monsterXp: Readonly<Record<string, number | undefined>>,
): { total: number; unknownIndexes: string[] } {
  let total = 0
  const unknown = new Set<string>()

  for (const combatant of combatants) {
    if (combatant.monsterIndex === null) continue

    const xp = monsterXp[combatant.monsterIndex]

    if (typeof xp === 'number' && Number.isFinite(xp) && xp >= 0) {
      total += Math.floor(xp)
    } else {
      unknown.add(combatant.monsterIndex)
    }
  }

  return { total, unknownIndexes: [...unknown] }
}

/**
 * Split a total between shares, rounded down.
 *
 * Down rather than nearest, and the remainder is simply dropped: 5e says
 * "divide the total by the number of characters", and a DM who cares about the
 * last four XP can type the number they want — which the award card lets them
 * do. No shares means nothing to split, not a division by zero.
 */
export function splitExperience(total: number, shares: number): number {
  if (shares <= 0) return 0
  return Math.max(0, Math.floor(Math.max(0, total) / Math.floor(shares)))
}

/**
 * The whole award, ready for the card: the fight's value, the party's size,
 * and each character's cut. The DM edits the last number before it is written
 * — this is the offer, not the decision.
 */
export function encounterExperience(
  combatants: readonly AwardableCombatant[],
  monsterXp: Readonly<Record<string, number | undefined>>,
): EncounterExperience {
  const { total, unknownIndexes } = totalMonsterExperience(combatants, monsterXp)
  const shares = combatants.filter((combatant) => combatant.characterId !== null).length

  return { total, shares, perCharacter: splitExperience(total, shares), unknownIndexes }
}
