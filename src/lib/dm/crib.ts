// The DM's crib — the paper screen, as data (`dm-run-suite/dm-rules-crib`).
//
// **Not prose, and not markdown.** The eleven `/rules` chapters already render
// the repo's markdown, and `/rules/quick-reference` is the long version of most
// of what is below. Neither is any use with six people waiting: reading a
// rendered chapter means scrolling a page of paragraphs for one number. So the
// same rulings are held here as *rows* — a thing on the left, the answer on the
// right — and the screen renders them as tables and steps a thumb can scan in
// five seconds without typing anything.
//
// **None of this is SRD text.** Game mechanics are not copyrightable and the
// SRD's own sentences are three times too long for this screen, so every line
// below is written fresh in the app's voice, on the 2024 baseline (SRD 5.2.1),
// the same rule `src/lib/glossary/terms.ts` and `src/lib/srd/in-play.ts` keep.
// The SRD's wording for the same rule is a tap away in `/rules`, with its
// attribution; nothing here carries any, because it is ours.
//
// House style for a line: one sentence, imperative or declarative, no jargon
// the glossary does not define, and the number always in digits. Never open
// with the entry's own label — the row prints it directly to the left.

/** One looked-up line: the thing you are looking for, and the answer. */
export interface CribEntry {
  /** The left-hand side, and what the eye scans down. */
  label: string
  /**
   * Glossary index whose popover the label opens
   * (`src/lib/glossary/terms.ts`), for the terms this build defines. Rows
   * naming something the glossary has no entry for — the fifteen conditions,
   * the light sources — simply carry no term and render as plain text, the
   * same fail-soft `GlossaryTerm` takes for an index it cannot resolve.
   */
  term?: string
  /** The answer, in one sentence. */
  detail: string
}

/** Rows of label → answer. The workhorse: most of the crib is these. */
export interface CribEntriesBlock {
  kind: 'entries'
  /** Heading over the rows, when a section holds more than one block. */
  title?: string
  entries: readonly CribEntry[]
}

/** A procedure, in order — what to do, not what a thing is. */
export interface CribStepsBlock {
  kind: 'steps'
  title?: string
  steps: readonly string[]
}

/** A row of number tiles, read left to right. Only the DC ladder needs it. */
export interface CribLadderBlock {
  kind: 'ladder'
  title?: string
  rungs: readonly { value: string; label: string }[]
}

/** One line qualifying the block above it — the exception, the "except when". */
export interface CribNoteBlock {
  kind: 'note'
  text: string
}

export type CribBlock = CribEntriesBlock | CribStepsBlock | CribLadderBlock | CribNoteBlock

/**
 * One situation at the table, and everything the DM needs for it.
 *
 * Grouped by *when you reach for it*, never by rulebook chapter: cover sits
 * with light and vision because "can they even see it" is one question asked
 * once, and the fifteen conditions are their own stop because they are the
 * only list long enough to need one.
 */
export interface CribSection {
  /** URL fragment, and what the jump chip targets. */
  id: string
  /** The chip's words — two at most, or the chip row wraps into a paragraph. */
  chip: string
  /** The heading, phrased as the moment it belongs to rather than as a topic. */
  title: string
  blocks: readonly CribBlock[]
}

/**
 * The crib, in the order a first session hits it.
 *
 * "Before the first roll" leads since `first-table/session-zero-one-pager`,
 * because it is the one stop read *before* the session rather than during it:
 * the ten-minute talk the research says a first table needs, and the session
 * zero checklist, as rows. "A player asks for something you have no rule for"
 * is next because it is the moment a new DM freezes, and it is the only stop
 * that is a *method* rather than a lookup. The rest descend by how often a
 * table reaches for them.
 */
export const CRIB_SECTIONS: readonly CribSection[] = [
  {
    id: 'first-roll',
    chip: 'First roll',
    title: 'Before the first roll',
    blocks: [
      {
        kind: 'steps',
        title: 'The ten-minute talk',
        steps: [
          'Describe what you do and we’ll see what happens. Say it in those words — nobody needs to have read a rule to start.',
          'When it matters, you roll the d20 and add one number off your sheet, against a target I hold. Higher is better.',
          'Hit points are how much you can take before you drop. Zero is down, not dead, and there are ways back.',
          'On your turn you move and do one thing. Everything else arrives when it comes up, and I’ll say when.',
          'Ask when you don’t know. There is no wrong question at this table and no rule you were meant to have read.',
        ],
      },
      {
        kind: 'entries',
        title: 'Session zero checklist',
        entries: [
          {
            label: 'Names',
            detail:
              'Everyone says their character’s name and one line about them, round the table.',
          },
          {
            label: 'Ties',
            detail:
              'One connection between every pair — a debt, a hometown, an old job. Ten minutes, and the best-spent ten of the night.',
          },
          {
            label: 'Lethality',
            detail:
              'Say out loud whether characters can die tonight. Either answer is fine; the table not knowing is not.',
          },
          {
            label: 'Phones',
            detail:
              'Agree the rule before the first roll, not after — face down on the table, or the sheet only.',
          },
          {
            label: 'Sixty seconds',
            detail:
              'A player gets a minute to make their case for a ruling, then the table moves on and you look it up later.',
          },
        ],
      },
      {
        kind: 'note',
        text: 'Write the answers on the campaign’s one page. The mistake that wastes a good session zero is not writing anything down.',
      },
    ],
  },
  {
    id: 'ruling',
    chip: 'Can I…?',
    title: 'They try something you have no rule for',
    blocks: [
      {
        kind: 'steps',
        steps: [
          'If it would obviously work, say yes and move on. Only call for a roll when failing would change what happens next.',
          'Name the ability the attempt leans on, then add a skill only if their training genuinely fits.',
          'Pick a DC off the ladder. Say what success and failure will look like before the die goes down.',
          'Give advantage for a good plan or a real edge, disadvantage for a bad position — never a second roll at the same attempt.',
          'Read the total, narrate the outcome, and keep the fiction moving. A miss is a complication, not a full stop.',
        ],
      },
      {
        kind: 'ladder',
        title: 'The DC ladder',
        rungs: [
          { value: '5', label: 'Very easy' },
          { value: '10', label: 'Easy' },
          { value: '15', label: 'Medium' },
          { value: '20', label: 'Hard' },
          { value: '25', label: 'Very hard' },
          { value: '30', label: 'Near impossible' },
        ],
      },
      {
        kind: 'note',
        text: 'When in doubt it is 15. A natural 20 succeeds and a natural 1 fails on every d20 roll in the 2024 rules — checks and saves included — so set the number knowing someone can always get there.',
      },
      {
        kind: 'entries',
        title: 'Which ability is it',
        entries: [
          {
            label: 'Strength',
            detail: 'Athletics — force, climbing, swimming, shoving, holding on.',
          },
          {
            label: 'Dexterity',
            detail: 'Acrobatics, Sleight of Hand, Stealth — balance, quiet hands, quiet feet.',
          },
          {
            label: 'Constitution',
            detail:
              'No skills at all. Call for a raw save or check when the body has to endure something.',
          },
          {
            label: 'Intelligence',
            detail:
              'Arcana, History, Investigation, Nature, Religion — what they know and what they can deduce.',
          },
          {
            label: 'Wisdom',
            detail:
              'Animal Handling, Insight, Medicine, Perception, Survival — what they notice and read.',
          },
          {
            label: 'Charisma',
            detail:
              'Deception, Intimidation, Performance, Persuasion — changing what someone else will do.',
          },
        ],
      },
      {
        kind: 'note',
        text: 'Nobody rolls to notice what their passive Perception already covers — compare 10 + their modifiers against the DC and tell them what they see.',
      },
    ],
  },
  {
    id: 'turn',
    chip: 'Their turn',
    title: 'It is their turn — what do they get?',
    blocks: [
      {
        kind: 'entries',
        title: 'The budget, every turn',
        entries: [
          {
            label: 'Movement',
            term: 'speed',
            detail: 'Up to their Speed, split before, between and after anything else they do.',
          },
          { label: 'Action', term: 'action', detail: 'One. The list below is all of them.' },
          {
            label: 'Bonus action',
            term: 'bonus-action',
            detail: 'At most one, and only when a spell or feature says it grants one.',
          },
          {
            label: 'Object interaction',
            detail: 'One free: draw a weapon, open a door, pull a potion off a belt.',
          },
          {
            label: 'Reaction',
            term: 'reaction',
            detail:
              'One per round, back at the start of their next turn — often used on someone else’s.',
          },
        ],
      },
      {
        kind: 'entries',
        title: 'The actions',
        entries: [
          {
            label: 'Attack',
            term: 'attack-roll',
            detail: 'One attack with a weapon or an Unarmed Strike; more only with Extra Attack.',
          },
          { label: 'Dash', detail: 'Extra movement equal to their Speed this turn.' },
          {
            label: 'Disengage',
            detail: 'Their movement provokes no Opportunity Attacks for the rest of the turn.',
          },
          {
            label: 'Dodge',
            detail:
              'Attacks against them have disadvantage and their Dex saves have advantage, until their next turn.',
          },
          {
            label: 'Help',
            detail:
              'Advantage on an ally’s check they are proficient in, or on an ally’s attack within 5 feet of them.',
          },
          {
            label: 'Hide',
            detail:
              'DC 15 Dexterity (Stealth), out of sight. On a success they gain the Invisible condition.',
          },
          {
            label: 'Influence',
            detail:
              'Change what an NPC will do — Charisma, or Wisdom (Animal Handling) with a beast.',
          },
          { label: 'Magic', detail: 'Cast a spell, use a magic item, or use a magical feature.' },
          {
            label: 'Ready',
            detail:
              'Name a trigger and a response now; the response costs their Reaction when it fires.',
          },
          {
            label: 'Search',
            detail: 'Look, listen or tend — Wisdom, with Perception the usual skill.',
          },
          { label: 'Study', detail: 'Recall or work something out — Intelligence.' },
          {
            label: 'Utilize',
            detail: 'Use a nonmagical object that needs more than a free interaction.',
          },
          {
            label: 'Unarmed Strike',
            detail:
              'Part of the Attack action: damage 1 + Str, or a Grapple or Shove the target saves against.',
          },
          { label: 'Improvise', detail: 'Anything else. You set the DC — see the ladder above.' },
        ],
      },
      {
        kind: 'note',
        text: 'Grapple and Shove force a Strength or Dexterity save against 8 + Strength modifier + proficiency bonus. Escaping one costs the escaper’s action: Athletics or Acrobatics against that same DC.',
      },
      {
        kind: 'entries',
        title: 'What spends a reaction',
        entries: [
          {
            label: 'Opportunity Attack',
            term: 'opportunity-attack',
            detail:
              'A creature they can see leaves their reach using its own movement. One attack, no move.',
          },
          { label: 'A readied action', detail: 'The trigger they named earlier fires.' },
          { label: 'A reaction spell', detail: 'Shield, Counterspell, Feather Fall and the like.' },
          {
            label: 'A monster’s reaction',
            detail: 'Whatever its stat block lists — tap the monster in the tracker to read it.',
          },
        ],
      },
      {
        kind: 'note',
        text: 'Forced movement never provokes: pushed, pulled and teleported creatures leave a reach for free. Only a creature spending its own movement does.',
      },
    ],
  },
  {
    id: 'conditions',
    chip: 'Conditions',
    title: 'Something landed a condition',
    blocks: [
      {
        kind: 'entries',
        entries: [
          {
            label: 'Blinded',
            detail:
              'Auto-fails sight checks. Attacks against it have advantage; its own have disadvantage.',
          },
          {
            label: 'Charmed',
            detail:
              'Cannot attack or harm the charmer, who has advantage on social checks with it.',
          },
          { label: 'Deafened', detail: 'Auto-fails hearing checks. Nothing else.' },
          {
            label: 'Exhaustion',
            term: 'exhaustion',
            detail:
              'Stacks: −2 on every d20 roll and −5 feet of Speed per level. Six is death; a long rest clears one.',
          },
          {
            label: 'Frightened',
            detail:
              'Disadvantage on checks and attacks while it can see the source, and it cannot move closer.',
          },
          {
            label: 'Grappled',
            detail:
              'Speed 0, disadvantage attacking anyone but the grappler, who can drag it along.',
          },
          {
            label: 'Incapacitated',
            detail:
              'No action, bonus action or reaction; concentration breaks; cannot speak; disadvantage on initiative.',
          },
          {
            label: 'Invisible',
            detail:
              'Concealed and surprising: advantage on initiative, attacks against it have disadvantage, its own have advantage.',
          },
          {
            label: 'Paralyzed',
            detail:
              'Incapacitated, Speed 0, auto-fails Str and Dex saves. Attacks have advantage, and hits within 5 feet crit.',
          },
          {
            label: 'Petrified',
            detail:
              'Incapacitated, Speed 0, resistance to all damage, immune to poison, auto-fails Str and Dex saves.',
          },
          { label: 'Poisoned', detail: 'Disadvantage on attack rolls and ability checks.' },
          {
            label: 'Prone',
            detail:
              'Crawl or spend half Speed to stand. Its attacks have disadvantage; attacks on it have advantage within 5 feet, disadvantage beyond.',
          },
          {
            label: 'Restrained',
            detail:
              'Speed 0, disadvantage on its attacks and Dex saves, advantage on attacks against it.',
          },
          {
            label: 'Stunned',
            detail:
              'Incapacitated, auto-fails Str and Dex saves, attacks against it have advantage.',
          },
          {
            label: 'Unconscious',
            detail:
              'Incapacitated and Prone, drops what it holds, unaware. Auto-fails Str and Dex saves; hits within 5 feet crit.',
          },
        ],
      },
      {
        kind: 'note',
        text: 'A condition ends when whatever caused it says it does. If nothing says, it lasts until a long rest — say out loud which one you are running.',
      },
    ],
  },
  {
    id: 'down',
    chip: '0 HP',
    title: 'Someone just hit 0 hit points',
    blocks: [
      {
        kind: 'steps',
        steps: [
          'Set them to exactly 0. Damage never goes below it, and any left over is simply gone — unless it is at least their hit point maximum, which kills them outright.',
          'They fall Unconscious and Prone, and they drop whatever they were holding.',
          'From the start of each of their turns they roll a plain d20 with nothing added. 10 or more is a success, 9 or less a failure.',
          'Three successes and they are stable. Three failures and they die. Both counters reset the moment they are stable or back above 0.',
          'A natural 1 counts as two failures. A natural 20 puts them back on 1 hit point, awake, on the spot.',
        ],
      },
      {
        kind: 'entries',
        title: 'While they are down',
        entries: [
          {
            label: 'Anything hits them',
            term: 'death-saving-throw',
            detail: 'One failure — two if it was a critical hit.',
          },
          {
            label: 'A melee hit from 5 feet',
            term: 'critical-hit',
            detail:
              'Automatically a critical hit against an unconscious creature, so two failures.',
          },
          {
            label: 'An ally reaches them',
            detail:
              'The Help action and a DC 10 Wisdom (Medicine) check stabilises them; a healer’s kit does it with no roll.',
          },
          {
            label: 'Any healing at all',
            detail: 'Wakes them at that total with both counters cleared. They are still Prone.',
          },
          {
            label: 'They are stable',
            detail:
              'No more death saves. They regain 1 hit point after 1d4 hours if nothing else happens.',
          },
          {
            label: 'A monster drops',
            detail:
              'It dies. Monsters make no death saves — decide before the hit if you want one captured alive.',
          },
        ],
      },
      {
        kind: 'note',
        text: 'Temporary hit points are not hit points: they soak damage first, never stack, and vanish on a long rest.',
      },
      // Sly Flourish, "Building 1st-level encounters" (`first-table/level-one-rails`):
      // no level is more dangerous than 1st, and the cure is to leave it fast.
      {
        kind: 'note',
        text: 'At level 1 this happens to somebody most nights, so get them to level 2 inside four hours of play.',
      },
    ],
  },
  {
    id: 'sight',
    chip: 'Cover & sight',
    title: 'Can they see it — and can they hit it?',
    blocks: [
      {
        kind: 'entries',
        title: 'Cover',
        entries: [
          {
            label: 'Half cover',
            term: 'cover',
            detail: '+2 AC and +2 on Dexterity saves. A low wall, a barrel, another creature.',
          },
          {
            label: 'Three-quarters cover',
            detail: '+5 AC and +5 on Dexterity saves. An arrow slit, a thick trunk, a portcullis.',
          },
          {
            label: 'Total cover',
            detail: 'Cannot be targeted directly at all — only caught in an area of effect.',
          },
        ],
      },
      {
        kind: 'entries',
        title: 'Light and obscurement',
        entries: [
          { label: 'Bright light', detail: 'Everything works normally.' },
          {
            label: 'Dim light',
            detail: 'Lightly obscured: disadvantage on Perception checks that rely on sight.',
          },
          {
            label: 'Darkness',
            detail:
              'Heavily obscured: they are effectively Blinded looking into it, whatever their eyes.',
          },
          {
            label: 'Darkvision',
            detail:
              'Darkness reads as dim light and dim as bright, within its range — in grey, no colour.',
          },
          {
            label: 'Fog, foliage, smoke',
            detail: 'Light or heavy by how thick it is, and it works both ways through.',
          },
        ],
      },
      {
        kind: 'note',
        text: 'Darkvision does not cancel the disadvantage: darkness becomes dim light, which is still lightly obscured. Magical darkness beats ordinary darkvision outright.',
      },
      {
        kind: 'entries',
        title: 'What they are carrying',
        entries: [
          { label: 'Torch', detail: '20 feet bright, 20 more dim. Burns 1 hour.' },
          { label: 'Candle', detail: '5 feet bright, 5 more dim. 1 hour.' },
          { label: 'Lamp', detail: '15 feet bright, 30 more dim. 6 hours a flask.' },
          {
            label: 'Hooded lantern',
            detail: '30 feet bright, 30 more dim, and it can be shuttered. 6 hours a flask.',
          },
          {
            label: 'Bullseye lantern',
            detail: 'A 60-foot cone bright, 60 more dim. 6 hours a flask.',
          },
          { label: 'Light cantrip', detail: '20 feet bright, 20 more dim, on an object. 1 hour.' },
        ],
      },
    ],
  },
  {
    id: 'travel',
    chip: 'Travel & rest',
    title: 'They are on the road, or stopping for the night',
    blocks: [
      {
        kind: 'entries',
        title: 'Pace',
        entries: [
          {
            label: 'Fast',
            detail: '4 miles an hour, 30 a day, and −5 passive Perception the whole way.',
          },
          { label: 'Normal', detail: '3 miles an hour, 24 a day. No penalty either way.' },
          {
            label: 'Slow',
            detail: '2 miles an hour, 18 a day, and the party can travel stealthily.',
          },
        ],
      },
      {
        kind: 'note',
        text: 'Past 8 hours of travel in a day: a Constitution save at the end of each further hour, DC 10 and one higher per hour past 8, or a level of Exhaustion.',
      },
      {
        kind: 'entries',
        title: 'Rests',
        entries: [
          {
            label: 'Short rest',
            term: 'short-rest',
            detail:
              '1 hour of nothing strenuous. They may spend Hit Point Dice — roll plus Constitution each — and short-rest features come back.',
          },
          {
            label: 'Long rest',
            term: 'long-rest',
            detail:
              '8 hours, at least 6 asleep. All hit points, all spell slots, half their Hit Point Dice back, and one level of Exhaustion off.',
          },
          {
            label: 'The limits',
            detail:
              'One long rest per 24 hours, and they need at least 1 hit point to start one. Short rests are unlimited.',
          },
        ],
      },
    ],
  },
  {
    id: 'arguments',
    chip: 'Arguments',
    title: 'The table is arguing about it',
    blocks: [
      {
        kind: 'entries',
        entries: [
          {
            label: 'Natural 20 on a check',
            detail:
              'Succeeds — in the 2024 rules a 20 succeeds and a 1 fails on any d20 roll, not just attacks.',
          },
          {
            label: 'Two spells in one turn',
            detail:
              'Only one that spends a slot, whatever actions they have. Cantrips are free of the limit.',
          },
          {
            label: 'Drinking a potion',
            detail: 'A bonus action — and so is feeding one to somebody else.',
          },
          {
            label: 'Critical hits',
            term: 'critical-hit',
            detail: 'Double every die, from every source. Never the flat modifiers.',
          },
          {
            label: 'Grappling',
            detail:
              'Not a contest any more: an Unarmed Strike, and the target saves against 8 + Str + proficiency.',
          },
          {
            label: 'Hiding mid-fight',
            detail:
              'DC 15 Stealth, and only from heavy obscurement or three-quarters cover, out of line of sight.',
          },
          {
            label: 'Surprise',
            detail:
              'Nobody loses a turn. A surprised creature rolls initiative with disadvantage and then plays normally.',
          },
          {
            label: 'Flanking',
            detail:
              'Not a rule. Run it as a house rule if the table wants it, and say so out loud first.',
          },
          {
            label: 'Stacking resistance',
            detail:
              'Never doubles. Two resistances still halve once, resistance and vulnerability cancel, and both apply last.',
          },
          {
            label: 'The Help action',
            detail:
              'One helper only, proficient for a check or within 5 feet for an attack. Advantage does not stack.',
          },
          {
            label: 'Concentration after damage',
            term: 'concentration',
            detail:
              'A Constitution save, DC 10 or half the damage, whichever is higher — once per source of damage.',
          },
          {
            label: 'Healing someone at 0',
            detail:
              'Any amount wakes them at that total, clears both counters, and leaves them Prone.',
          },
        ],
      },
      {
        kind: 'note',
        text: 'Rule for all of these: make the call in ten seconds, say it is provisional, and look it up after the session. Momentum is worth more than being right.',
      },
    ],
  },
]

/** The section with this id, or `null` — the same fail-soft the lookups take. */
export function cribSection(id: string): CribSection | null {
  return CRIB_SECTIONS.find((section) => section.id === id) ?? null
}
