// Per-campaign feature gates (D40, `dm-prep-suite/campaign-feature-gates`).
//
// The app grows with the group. A campaign carries five switches, all off, and
// while one is off the surface it names is simply not on its players' sheets —
// the simplest possible session 1, with a fifteen-condition chip grid and a
// daily preparation ritual arriving only once the table has asked for them.
//
// The fifth switch, experience points, is the odd one and the reason the set is
// worth having: Jamie's table levels by milestone (D35), so XP is not simply
// early for this group — it is a system they do not use. Off by default retires
// its whole surface without deleting a column or a line of `experience.ts`, and
// the one campaign that wants XP back gets it with a tap. It is also the only
// gate that hides something on a **DM** screen — the encounter tracker's award
// step — because that step writes the players' XP, and hiding the total while
// leaving the thing that fills it in would be half a decision.
//
// Three rules hold this together, and every consumer depends on all three:
//
// - **A gate hides UI. It never deletes state.** Nothing here writes a
//   character column, and no card behind a gate is allowed to clear what it
//   stops showing. A cleric's prepared list, a barbarian's rage pool and a
//   party's coins keep being tracked underneath — rests still refill pools,
//   exhaustion still subtracts from every d20 test — so flipping a gate on
//   reveals what was always there rather than starting it from zero.
// - **A gate is not an access control.** It is a complexity dial for the
//   player's own sheet, and every read of it fails towards *more* surface: a
//   character in no campaign sees everything, an unreadable or absent value
//   reads as everything, and a character at two tables gets the union of what
//   its DMs have switched on (see {@link resolveGates}). Nothing about anyone
//   else's data is decided here.
// - **Off is the stored default, and `NULL` is off.** The column is additive
//   and nullable, so every campaign written before this feature — and every
//   one written since without touching the settings screen — reads as every
//   gate off without a backfill.
//
// This module is deliberately dependency-free. `src/lib/db/schema.ts` imports
// the type, and drizzle-kit bundles that file with its own pass that does not
// read tsconfig paths or expect a React/zod graph underneath it — the same
// reason `src/lib/images/schema.ts` validates by hand.

/** The six gates, in the order the settings screen lists them. */
export const GATE_KEYS = [
  'spellPreparation',
  'conditions',
  'currency',
  'classResources',
  'experiencePoints',
  'weaponMastery',
] as const

export type GateKey = (typeof GATE_KEYS)[number]

/**
 * The gates as the `campaigns.gates` column stores them.
 *
 * Partial on purpose: an absent key is off, so the column holds only what a DM
 * has actually switched on and a gate added in a later release costs no
 * migration. `NULL` is the same answer as `{}`.
 */
export type CampaignGates = Partial<Record<GateKey, boolean>>

/** The gates as a sheet reads them: every key answered, no `undefined`. */
export type SheetGates = Record<GateKey, boolean>

/** One gate, as the DM's settings screen renders it. */
export interface GateDescriptor {
  key: GateKey
  /** The switch's label — what the surface is called, not what it does. */
  label: string
  /**
   * What turning it on adds *for the players*, in one plain line. Written for
   * a DM who has never seen the card it describes, so it names what appears on
   * their players' sheets rather than the feature's internal name.
   */
  adds: string
  /**
   * What the players get while it is off — the honest half of the choice, and
   * the promise that nothing is being thrown away.
   */
  whileOff: string
}

/**
 * The gates the set covers, with the words the DM decides from.
 *
 * One list, and it is both the switch order and the validator's key set: a
 * gate added to {@link GATE_KEYS} without a line here fails a unit test rather
 * than shipping a switch with no explanation on it.
 */
export const GATES: readonly GateDescriptor[] = [
  {
    key: 'spellPreparation',
    label: 'Choosing spells each day',
    adds: 'Casters pick which spells they have ready, and change the list after every long rest.',
    whileOff: 'Their prepared spells stay fixed to the set they started with, and still cast.',
  },
  {
    key: 'conditions',
    label: 'Conditions and exhaustion',
    adds: 'Players mark themselves poisoned, frightened or prone, and count levels of exhaustion.',
    whileOff:
      'You call the conditions at the table. Anything already marked keeps affecting their rolls.',
  },
  {
    key: 'currency',
    label: 'Coins and carrying',
    adds: 'Players keep their own purse on the sheet — the five coin types, spent and earned by hand.',
    whileOff: 'Money is yours to track. Whatever they are carrying is still on the sheet.',
  },
  {
    key: 'classResources',
    label: 'Class resources',
    adds: 'Players spend and count the pools their class carries — Rage, Ki, Channel Divinity.',
    whileOff: 'You count them. Rests still refill the pools, so nothing drifts while it is hidden.',
  },
  {
    key: 'experiencePoints',
    label: 'Experience points',
    adds: 'Players see an XP total and a bar to the next level, and you can award a fight’s XP from the tracker.',
    whileOff:
      'Levels come from the story: you say when the party levels, and their sheets ask them to.',
  },
  // The sixth gate (`first-table/weapon-mastery-gate`): the starter box's
  // class boards leave mastery off, and the research calls it "another
  // decision point" for a learner. The choice is made silently at creation
  // (`first-table/creation-readiness`), so opening the gate reveals a finished
  // choice rather than an empty picker.
  {
    key: 'weaponMastery',
    label: 'Weapon mastery',
    adds: 'Each weapon’s mastery property — Sap, Vex, Topple — shows on the attack row, and players choose which weapons they have mastered.',
    whileOff: 'Attacks carry no mastery line. The weapons chosen for them stay chosen.',
  },
]

/** Everything on — what a character outside any campaign sees. */
export const ALL_GATES_ON: SheetGates = Object.fromEntries(
  GATE_KEYS.map((key) => [key, true]),
) as SheetGates

/** Everything off — the stored default, and the shape of session 1. */
export const ALL_GATES_OFF: SheetGates = Object.fromEntries(
  GATE_KEYS.map((key) => [key, false]),
) as SheetGates

function isGateKey(key: string): key is GateKey {
  return (GATE_KEYS as readonly string[]).includes(key)
}

/**
 * Read an unknown value as gates, keeping only known keys with boolean values.
 *
 * One function for two jobs, because they are the same job: validating a PATCH
 * body from the settings screen, and reading a `jsonb` column that a hand-run
 * `UPDATE` or an older release may have written something else into. Anything
 * unrecognised is dropped rather than rejected — a gate this build does not
 * know about is not a reason to refuse a DM the switches this one has.
 */
export function parseGates(value: unknown): CampaignGates {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}

  const gates: CampaignGates = {}

  for (const [key, on] of Object.entries(value)) {
    if (isGateKey(key) && typeof on === 'boolean') gates[key] = on
  }

  return gates
}

/**
 * What a sheet may show, given the gates of every campaign its character is in.
 *
 * **No campaigns means everything.** A character made and never joined to a
 * table is nobody's to simplify, and this is also the answer a failed or
 * unauthorised read arrives at — the fallback is the full sheet the app had
 * before gates existed, never a blank one.
 *
 * **Two campaigns means the union.** One character, one sheet: a player at a
 * beginner table and a veteran one cannot have their coins both hidden and
 * shown, so anything *any* of their DMs has switched on stays switched on. The
 * cost of being wrong that way is a card they do not need yet; the cost of the
 * other way is a card they used last week disappearing.
 */
export function resolveGates(stored: readonly (CampaignGates | null)[]): SheetGates {
  if (stored.length === 0) return { ...ALL_GATES_ON }

  const resolved = { ...ALL_GATES_OFF }

  for (const gates of stored) {
    const parsed = parseGates(gates)
    for (const key of GATE_KEYS) {
      if (parsed[key]) resolved[key] = true
    }
  }

  return resolved
}
