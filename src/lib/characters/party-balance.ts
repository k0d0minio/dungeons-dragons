// Gentle party-composition hints for the creation wizard
// (`guided-creation/party-balance-hints`).
//
// Five or six friends make characters for the same table, mostly apart, mostly
// without knowing what the others picked. The result is the classic first
// campaign: four people who hit things and nobody who can put anyone back
// together. This module is the one sentence that would have prevented it.
//
// **What this is not.** It is not a validator, a score, or a party optimiser.
// It never blocks, never disagrees with a choice, and never says a duplicate
// class is a mistake — two Rogues is a real party and the copy below says so
// out loud. The stub's word is *gentle*; the test for every line is whether it
// would still be welcome read aloud by the friend who wrote it.
//
// **One hint, or none.** {@link partyHint} returns at most one — an ordered
// table of rules, first match wins, the same shape `vibe-quiz.ts` uses and for
// the same reason: a nudge somebody disagrees with should be a line you can
// point at. A second hint would turn advice into a checklist.
//
// **Only inside a campaign.** There is no hint without a party to describe, so
// the caller passes the classes already on that campaign's roster and nothing
// here invents a party from nowhere. `/characters/new` outside a campaign
// passes an empty list and gets `null`.
// ---------------------------------------------------------------------------
// What a class covers
// ---------------------------------------------------------------------------

/**
 * The four things a beginner party notices the absence of.
 *
 * Deliberately four and not the whole taxonomy of party roles: these are the
 * gaps that change how a first session *goes* — nobody standing at the front,
 * nobody to heal, nobody to scout or open a lock, nobody with a spell. Damage
 * is not on the list because every class in the game deals damage, and a
 * "face" role is not either because at level 1 anybody can talk.
 */
export type PartyRole = 'heal' | 'front' | 'sneak' | 'magic'

/** The roles, in the order a missing one is worth mentioning. */
export const PARTY_ROLES: readonly PartyRole[] = ['heal', 'front', 'sneak', 'magic']

/**
 * Which of the four each of the twelve SRD 5.2.1 classes covers.
 *
 * Authored rather than derived, with two rules held by `party-balance.test.ts`:
 * every class the SRD data carries has an entry, and `magic` agrees exactly
 * with the rules engine's own `spellcastingAbility` — which is why the Paladin
 * and the Ranger are in it, since in the 2024 rules both cast from level 1.
 *
 * The one judgement call worth writing down: a **Cleric is not `front`**. It
 * can wear armour and hold a line, but in a party of first-timers the Cleric is
 * the healer, and letting one class answer both questions hides a gap that is
 * really there. The reverse call is the Paladin, which genuinely is both — it
 * is the front line *and* the only other class that opens with `cure wounds`
 * ready.
 */
export const CLASS_ROLES: Readonly<Record<string, readonly PartyRole[]>> = {
  barbarian: ['front'],
  bard: ['heal', 'magic'],
  cleric: ['heal', 'magic'],
  druid: ['heal', 'magic'],
  fighter: ['front'],
  monk: ['front', 'sneak'],
  paladin: ['front', 'heal', 'magic'],
  ranger: ['sneak', 'magic'],
  rogue: ['sneak'],
  sorcerer: ['magic'],
  warlock: ['magic'],
  wizard: ['magic'],
}

/** The roles a class covers — empty for a class this build has never heard of. */
export function rolesOf(classIndex: string): readonly PartyRole[] {
  return CLASS_ROLES[classIndex] ?? []
}

/** True when the class covers that role. */
export function covers(classIndex: string, role: PartyRole): boolean {
  return rolesOf(classIndex).includes(role)
}

// ---------------------------------------------------------------------------
// The party as the rules see it
// ---------------------------------------------------------------------------

export interface PartyComposition {
  /** How many characters are already on the roster. */
  size: number
  /** How many of them cover each role. */
  counts: Readonly<Record<PartyRole, number>>
}

/**
 * Count the roster by role.
 *
 * A class index the SRD data does not carry counts towards the party's size and
 * towards no role — it is a character sitting at the table doing something this
 * module cannot describe, which is exactly how it should be treated.
 */
export function partyComposition(classIndexes: readonly string[]): PartyComposition {
  const counts = Object.fromEntries(PARTY_ROLES.map((role) => [role, 0])) as Record<
    PartyRole,
    number
  >

  for (const classIndex of classIndexes) {
    for (const role of rolesOf(classIndex)) counts[role] += 1
  }

  return { size: classIndexes.length, counts }
}

/**
 * The smallest party worth describing.
 *
 * One character is not a composition — "the one person here cannot heal" is a
 * remark about a person, not about a party, and the second player to arrive
 * should not be told the first one got it wrong.
 */
export const MINIMUM_PARTY_SIZE = 2

/**
 * How many of a party have to share a role before it is worth mentioning: at
 * least three of them, and all but one of the party.
 *
 * "More than half" was the first draft and it was far too loud — eight of the
 * twelve classes cast a spell at level 1, so three casters out of five is what
 * an ordinary party looks like, and saying so every time is the nagging this
 * feature is supposed to avoid. All-but-one is a party that has genuinely
 * leaned: four of the five sneaking, three of the four in armour.
 */
function crowded(count: number, size: number): boolean {
  return count >= 3 && count >= size - 1
}

/** Small numbers read as words in a sentence. Nine is as far as a party goes. */
const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
]

function spellOut(count: number): string {
  return NUMBER_WORDS[count] ?? String(count)
}

/** The same word with a capital, for a sentence that opens on the count. */
function spellOutCapitalised(count: number): string {
  const word = spellOut(count)
  return word.charAt(0).toUpperCase() + word.slice(1)
}

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

/** Why a rule fired: nobody covers the role, or most of the party does. */
export type PartyHintKind = 'gap' | 'crowded'

export interface PartyHint {
  /** Stable id for the rule that fired — what a test names and a log would. */
  id: string
  kind: PartyHintKind
  role: PartyRole
  /** The whole hint, as the player reads it. One or two short sentences. */
  text: string
}

interface PartyHintRule {
  id: string
  kind: PartyHintKind
  role: PartyRole
  /** True when this rule has something to say about that party. */
  when: (composition: PartyComposition) => boolean
  /** The sentence, with the party's own numbers in it. */
  line: (composition: PartyComposition) => string
}

/**
 * The rules, first match wins.
 *
 * Gaps before crowding, because "nobody can heal" is more use to somebody
 * standing on the class step than "three of you are sneaky" is. Within the
 * gaps, the order is {@link PARTY_ROLES} — a missing healer is the one a table
 * of beginners feels first.
 *
 * **There is no `magic` gap rule**, and its absence is deliberate rather than
 * an oversight: in these rules every class that heals also casts, so a party
 * with no spells in it is always a party with no healer, and the healer rule
 * would win every time. A "nobody casts a spell" line would be a rule that can
 * never fire. The same containment is why the crowded healers rule sits *above*
 * the crowded casters one — a party thick with healers is thick with casters by
 * definition, and "three of you can heal" is the more useful half of that.
 * `party-balance.test.ts` walks every party up to five characters through the
 * table and holds each rule below to being reachable, which is what caught both
 * of those the first time.
 *
 * Every line ends by saying the party is fine as it is. That is not padding:
 * the whole risk of this feature is a first-time player reading a nudge as a
 * requirement and building a character they did not want.
 */
export const PARTY_HINT_RULES: readonly PartyHintRule[] = [
  {
    id: 'no-healer',
    kind: 'gap',
    role: 'heal',
    when: ({ counts }) => counts.heal === 0,
    line: ({ size }) =>
      `The ${spellOut(size)} already at this table have nobody who can heal. A Cleric, Bard, Druid or Paladin would cover it — plenty of parties get by without one, so this is only worth knowing.`,
  },
  {
    id: 'no-front-line',
    kind: 'gap',
    role: 'front',
    when: ({ counts }) => counts.front === 0,
    line: ({ size }) =>
      `Nobody among the ${spellOut(size)} already here is built to stand at the front and soak the hits. A Barbarian, Fighter, Monk or Paladin does that happily — no obligation to be the one who does.`,
  },
  {
    id: 'no-scout',
    kind: 'gap',
    role: 'sneak',
    when: ({ counts }) => counts.sneak === 0,
    line: ({ size }) =>
      `None of the ${spellOut(size)} already here scouts ahead or gets past a lock. A Rogue, Ranger or Monk is the usual answer — and a party that kicks the door in instead is having a fine time.`,
  },
  {
    id: 'lots-of-sneaks',
    kind: 'crowded',
    role: 'sneak',
    when: ({ counts, size }) => crowded(counts.sneak, size),
    line: ({ counts, size }) =>
      `${spellOutCapitalised(counts.sneak)} of the ${spellOut(size)} already here are the sneaking sort. Doubling up is genuinely fine — there is just room for something else too.`,
  },
  {
    id: 'lots-of-front-liners',
    kind: 'crowded',
    role: 'front',
    when: ({ counts, size }) => crowded(counts.front, size),
    line: ({ counts, size }) =>
      `${spellOutCapitalised(counts.front)} of the ${spellOut(size)} already here are front-liners. Make it one more if that is the character you want — there is also room for someone behind them.`,
  },
  {
    id: 'lots-of-healers',
    kind: 'crowded',
    role: 'heal',
    when: ({ counts, size }) => crowded(counts.heal, size),
    line: ({ counts, size }) =>
      `${spellOutCapitalised(counts.heal)} of the ${spellOut(size)} already here can heal. That is a party that can keep going all day — so build whatever appeals.`,
  },
  {
    id: 'lots-of-casters',
    kind: 'crowded',
    role: 'magic',
    when: ({ counts, size }) => crowded(counts.magic, size),
    line: ({ counts, size }) =>
      `${spellOutCapitalised(counts.magic)} of the ${spellOut(size)} already here cast spells. A party of casters is a real party — there is simply room for someone in armour too.`,
  },
]

/**
 * The one hint to show on the class step, or `null` for silence.
 *
 * `partyClassIndexes` is the roster *without* the character being made; the
 * class currently selected in the wizard is passed separately, and a gap the
 * selection already fills is not a gap any more — telling somebody who has just
 * highlighted the Cleric that nobody can heal is both wrong and the exact
 * nagging tone the stub rules out. A crowded-role hint is unaffected by the
 * selection, because it describes the others and asks for nothing.
 *
 * Silence is the common answer, and it is the right one: no campaign, a party
 * of one, or a party that is simply balanced.
 */
export function partyHint(
  partyClassIndexes: readonly string[],
  selectedClassIndex: string | null = null,
): PartyHint | null {
  if (partyClassIndexes.length < MINIMUM_PARTY_SIZE) return null

  const composition = partyComposition(partyClassIndexes)

  const rule = PARTY_HINT_RULES.find(
    (candidate) =>
      candidate.when(composition) &&
      !(
        candidate.kind === 'gap' &&
        selectedClassIndex !== null &&
        covers(selectedClassIndex, candidate.role)
      ),
  )

  if (!rule) return null

  return { id: rule.id, kind: rule.kind, role: rule.role, text: rule.line(composition) }
}
