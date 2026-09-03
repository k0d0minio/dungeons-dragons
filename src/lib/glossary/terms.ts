// The glossary itself (`learn-to-play/glossary-popovers`).
//
// Sixty terms, grouped the way a session meets them rather than alphabetically
// — the order is what `/rules` key-term strips and any future glossary index
// read, and a beginner who scrolls this list should meet the D20 Test before
// they meet a spell slot.
//
// Every definition is written here, in this app's voice, on the 2024 rules
// baseline: two sentences, no rulebook phrasing, no jargon a term further up
// the list has not already introduced. Where 2024 renamed or changed something
// the definition describes the 2024 behaviour and says so plainly, because the
// tables and blogs a beginner will find are mostly still on 2014.
import type { GlossaryEntry } from './types'

export const GLOSSARY_TERMS: readonly GlossaryEntry[] = [
  // ── The dice ────────────────────────────────────────────────────────────
  {
    index: 'd20-test',
    term: 'D20 Test',
    definition:
      'The one roll the whole game is built on: roll a twenty-sided die, add a modifier, and compare the total to a target number. Ability checks, saving throws and attack rolls are all D20 Tests, which is why the same words — advantage, proficiency, the bonus you add — keep turning up everywhere.',
    seeAlso: ['ability-check', 'saving-throw', 'attack-roll', 'modifier'],
  },
  {
    index: 'ability-check',
    term: 'Ability check',
    definition:
      'A roll to see whether you manage something difficult — picking a lock, spotting a trap, convincing a guard. The DM names the ability and a difficulty, you roll a d20 and add that ability’s modifier plus your proficiency bonus if the matching skill is one of yours.',
    seeAlso: ['d20-test', 'skill', 'difficulty-class', 'proficiency-bonus'],
  },
  {
    index: 'saving-throw',
    term: 'Saving throw',
    definition:
      'A roll to resist something happening to you — a fireball, a poison, a spell that would charm you. You do not choose to make one: something else forces it, and the number to beat comes from whatever caused it.',
    seeAlso: ['d20-test', 'spell-save-dc', 'death-saving-throw', 'condition'],
  },
  {
    index: 'attack-roll',
    term: 'Attack roll',
    definition:
      'The roll that decides whether you hit: d20, plus the ability modifier the weapon or spell uses, plus your proficiency bonus if you are proficient with it. Beat the target’s Armour Class and you hit, then roll damage separately.',
    seeAlso: ['armour-class', 'critical-hit', 'damage-type', 'spell-attack-roll'],
  },
  {
    index: 'modifier',
    term: 'Modifier',
    definition:
      'The number you add to a die roll, written with its sign so it is never ambiguous — +3, −1. This app shows you the finished modifier on the sheet, so what you see beside a skill or a save is the whole number to add, with nothing left to work out.',
    seeAlso: ['ability-score', 'proficiency-bonus', 'ability-check'],
  },
  {
    index: 'advantage',
    term: 'Advantage',
    definition:
      'Roll two d20s instead of one and use the higher — that is the entire rule. Advantage never stacks: two reasons to have it is still just two dice, and if you have disadvantage as well the two cancel out and you roll one die.',
    seeAlso: ['disadvantage', 'd20-test'],
  },
  {
    index: 'disadvantage',
    term: 'Disadvantage',
    definition:
      'Roll two d20s and use the lower. Like advantage it never stacks, and one instance of each cancels to a single ordinary roll no matter how many of each you have.',
    seeAlso: ['advantage', 'd20-test', 'condition'],
  },
  {
    index: 'difficulty-class',
    term: 'Difficulty Class (DC)',
    definition:
      'The number an ability check or saving throw has to reach, set by the DM or printed in a spell. Ten is something most people manage, fifteen takes some doing, twenty is remarkable.',
    seeAlso: ['ability-check', 'saving-throw', 'spell-save-dc'],
  },
  {
    index: 'critical-hit',
    term: 'Critical hit',
    definition:
      'A natural 20 on an attack roll — the die itself showing 20, before any modifier — always hits and lets you roll the attack’s damage dice twice. Only the dice double, not the modifier you add to them.',
    seeAlso: ['attack-roll', 'damage-type'],
  },
  {
    index: 'passive-perception',
    term: 'Passive Perception',
    definition:
      'A standing score for noticing things without anyone rolling: ten plus your Perception check modifier. The DM compares it to hidden things quietly, so you never have to ask whether you spot something.',
    seeAlso: ['ability-check', 'skill'],
  },
  {
    index: 'heroic-inspiration',
    term: 'Heroic Inspiration',
    definition:
      'A one-use reward the DM hands out for good play, and in 2024 it has one fixed use: spend it to reroll any die you just rolled and take the new result. You can only hold one at a time, so spend it rather than saving it for a better moment that may not come.',
    seeAlso: ['advantage', 'd20-test'],
  },

  // ── The character ───────────────────────────────────────────────────────
  {
    index: 'ability-score',
    term: 'Ability score',
    definition:
      'The six numbers your character is built from — Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma — usually somewhere between 8 and 20. The score itself is barely used at the table: what you roll with is its modifier, which is the score minus ten, halved and rounded down.',
    seeAlso: ['modifier', 'ability-check', 'background'],
  },
  {
    index: 'proficiency',
    term: 'Proficiency',
    definition:
      'Being trained in something — a skill, a saving throw, a kind of weapon, a tool. Proficiency is all-or-nothing: you either add your proficiency bonus to that roll or you do not, and it never comes in halves except for a bard’s Jack of All Trades.',
    seeAlso: ['proficiency-bonus', 'expertise', 'skill'],
  },
  {
    index: 'proficiency-bonus',
    term: 'Proficiency bonus',
    definition:
      'One number that grows with your character level, from +2 at first level to +6 at seventeenth, and it is the same for every class. You add it to any roll you are proficient in — and it quietly sets your spell save DC and attack bonuses too.',
    seeAlso: ['proficiency', 'character-level', 'expertise', 'spell-save-dc'],
  },
  {
    index: 'expertise',
    term: 'Expertise',
    definition:
      'A feature that doubles your proficiency bonus for one particular skill, so a rogue with Expertise in Stealth adds it twice. You must already be proficient in the skill to take Expertise in it.',
    seeAlso: ['proficiency', 'proficiency-bonus', 'skill'],
  },
  {
    index: 'skill',
    term: 'Skill',
    definition:
      'One of eighteen named areas of competence — Stealth, Perception, Persuasion and so on — each tied to an ability. A skill is not a separate roll: it is a reason to add your proficiency bonus to that ability’s check.',
    seeAlso: ['ability-check', 'proficiency', 'expertise', 'passive-perception'],
  },
  {
    index: 'hit-points',
    term: 'Hit points',
    definition:
      'How much punishment you can take before you drop, reduced by damage and restored by healing and rests. Reaching exactly zero does not kill you — it knocks you unconscious and starts your death saving throws.',
    seeAlso: ['temporary-hit-points', 'death-saving-throw', 'hit-dice', 'bloodied'],
  },
  {
    index: 'temporary-hit-points',
    term: 'Temporary hit points',
    definition:
      'A buffer that sits on top of your hit points and is spent first, and it is never healing — it does not raise your maximum and does not stack. Two sources of temporary hit points means picking the larger of the two, not adding them together.',
    seeAlso: ['hit-points'],
  },
  {
    index: 'hit-dice',
    term: 'Hit dice',
    definition:
      'A pool of dice, one per character level, sized by your class — a d6 for a wizard, a d10 for a fighter. You spend them on a short rest to heal, and a long rest gives back half of them, so they are the resource that decides how many fights a day you can take.',
    seeAlso: ['short-rest', 'long-rest', 'hit-points'],
  },
  {
    index: 'bloodied',
    term: 'Bloodied',
    definition:
      'A creature is Bloodied when it is at half its hit points or fewer — the 2024 rules made this an official word again. It does nothing on its own; it is a signal the DM can describe and some features can key off.',
    seeAlso: ['hit-points'],
  },
  {
    index: 'character-level',
    term: 'Character level',
    definition:
      'How far along your character is, from 1 to 20, gained by earning experience or when the DM says the party levels up. Every level adds hit points and often a class feature, and your proficiency bonus rises at levels 5, 9, 13 and 17.',
    seeAlso: ['experience-points', 'proficiency-bonus', 'class', 'hit-dice'],
  },
  {
    index: 'experience-points',
    term: 'Experience points (XP)',
    definition:
      'Points awarded for overcoming challenges that accumulate towards your next level. Plenty of tables skip them entirely and simply level the party when the story reaches a good point — ask your DM which you are doing.',
    seeAlso: ['character-level'],
  },
  {
    index: 'class',
    term: 'Class',
    definition:
      'What your character does — fighter, wizard, rogue and nine others — deciding your hit dice, your proficiencies, whether you cast spells and which features you gain as you level. It is the single choice that changes your turn-to-turn play the most.',
    seeAlso: ['subclass', 'character-level', 'spell-slot', 'hit-dice'],
  },
  {
    index: 'subclass',
    term: 'Subclass',
    definition:
      'A specialisation inside your class, chosen at third level in the 2024 rules, that adds features on top of the class’s own. Your first two levels are the same as everyone else’s in that class.',
    seeAlso: ['class', 'character-level'],
  },
  {
    index: 'species',
    term: 'Species',
    definition:
      'What your character is — human, elf, dwarf and so on — giving you size, speed and a few traits like darkvision. In the 2024 rules species no longer changes your ability scores; your background does that.',
    seeAlso: ['background', 'ability-score', 'speed'],
  },
  {
    index: 'background',
    term: 'Background',
    definition:
      'Where your character came from before the adventure, and in the 2024 rules it carries real weight: it grants your ability score increases, two skill proficiencies, a tool and an Origin feat. Pick it for what it gives as much as for the story.',
    seeAlso: ['ability-score', 'origin-feat', 'skill', 'species'],
  },
  {
    index: 'feat',
    term: 'Feat',
    definition:
      'A named package of abilities you take instead of, or alongside, raising ability scores as you level. In the 2024 rules feats come in tiers — Origin feats from your background, and general feats at the levels that offer an ability score improvement.',
    seeAlso: ['origin-feat', 'character-level', 'ability-score'],
  },
  {
    index: 'origin-feat',
    term: 'Origin feat',
    definition:
      'The starter feat every character gets at first level from their background — Alert, Magic Initiate, Tough and the rest. It is deliberately small but always on, so it shapes how your first sessions feel.',
    seeAlso: ['feat', 'background'],
  },

  // ── A turn in combat ────────────────────────────────────────────────────
  {
    index: 'initiative',
    term: 'Initiative',
    definition:
      'The d20 roll at the start of a fight, adding your Dexterity modifier, that fixes the order everyone acts in. You roll it once and keep that place for the whole combat.',
    seeAlso: ['round', 'turn', 'd20-test'],
  },
  {
    index: 'round',
    term: 'Round',
    definition:
      'One pass through the initiative order, in which everyone in the fight takes one turn. A round is six seconds of story time, which is why a spell that lasts a minute lasts ten rounds.',
    seeAlso: ['turn', 'initiative', 'concentration'],
  },
  {
    index: 'turn',
    term: 'Turn',
    definition:
      'Your slot in the round: you get your movement, one action, and a bonus action if you have something that uses one. Your reaction is not part of your turn — you keep that for someone else’s.',
    seeAlso: ['action', 'bonus-action', 'reaction', 'speed'],
  },
  {
    index: 'action',
    term: 'Action',
    definition:
      'The main thing you do on your turn — Attack, Cast a Spell, Dash, Disengage, Dodge, Hide, Help, Ready, Search, Study, Influence or Utilize. You get exactly one, and choosing well matters more than any dice roll on your turn.',
    seeAlso: ['bonus-action', 'reaction', 'turn'],
  },
  {
    index: 'bonus-action',
    term: 'Bonus action',
    definition:
      'An extra, smaller thing on your turn — but only if some feature, spell or weapon specifically says it takes a bonus action. It is not a spare action to spend as you like, which is the single most common beginner mistake.',
    seeAlso: ['action', 'turn', 'reaction'],
  },
  {
    index: 'reaction',
    term: 'Reaction',
    definition:
      'One response you can make between your turns, when something specific triggers it — an opportunity attack, a Shield spell, a feature that says "when". You get one per round and it comes back at the start of your turn.',
    seeAlso: ['opportunity-attack', 'action', 'turn'],
  },
  {
    index: 'opportunity-attack',
    term: 'Opportunity Attack',
    definition:
      'A free swing you take as a reaction when an enemy you can see leaves your reach on its own movement. Taking the Disengage action, or being teleported or shoved, avoids provoking one.',
    seeAlso: ['reaction', 'action', 'speed'],
  },
  {
    index: 'speed',
    term: 'Speed',
    definition:
      'How far you can move on your turn, in feet — thirty for most characters, twenty-five for a dwarf or a gnome. You can break it up around your action however you like, moving some, attacking, then moving the rest.',
    seeAlso: ['turn', 'action', 'exhaustion'],
  },
  {
    index: 'cover',
    term: 'Cover',
    definition:
      'Something between you and an attacker that makes you harder to hit: half cover gives +2 to your Armour Class and Dexterity saves, three-quarters cover gives +5, total cover means you cannot be targeted at all. Only the best cover applies, and it is worth asking the DM about before you pick a square.',
    seeAlso: ['armour-class', 'attack-roll'],
  },
  {
    index: 'armour-class',
    term: 'Armour Class (AC)',
    definition:
      'The number an attack roll has to reach to hit you, set by what you are wearing and your Dexterity. Equipping armour on this sheet works it out for you; without armour it is the number stored on your character.',
    seeAlso: ['attack-roll', 'cover', 'ability-score'],
  },
  {
    index: 'damage-type',
    term: 'Damage type',
    definition:
      'What kind of harm the damage is — slashing, fire, poison, psychic and a dozen more. It matters only when something resists, is immune to, or is vulnerable to that type, which is why you say it out loud when you deal damage.',
    seeAlso: ['resistance', 'vulnerability', 'immunity'],
  },
  {
    index: 'resistance',
    term: 'Resistance',
    definition:
      'Take half the damage of a given type, rounded down, applied after everything else has been added up. Resistance never doubles up: two sources of fire resistance still halve the damage once.',
    seeAlso: ['damage-type', 'vulnerability', 'immunity'],
  },
  {
    index: 'vulnerability',
    term: 'Vulnerability',
    definition:
      'Take double the damage of a given type — the mirror of resistance and much rarer. If something is both resistant and vulnerable to the same type, the two cancel out.',
    seeAlso: ['damage-type', 'resistance', 'immunity'],
  },
  {
    index: 'immunity',
    term: 'Immunity',
    definition:
      'Take none of that damage type at all, or be unable to be given that condition. Immunity beats resistance and vulnerability outright rather than combining with them.',
    seeAlso: ['damage-type', 'resistance', 'condition'],
  },
  {
    index: 'weapon-mastery',
    term: 'Weapon mastery',
    definition:
      'New in 2024: every weapon carries a mastery property — Vex, Topple, Sap and the rest — that triggers on a hit for characters whose class grants the mastery. You know a fixed number of masteries and pick which weapons they apply to when you finish a long rest.',
    seeAlso: ['attack-roll', 'class', 'long-rest'],
  },
  {
    index: 'condition',
    term: 'Condition',
    definition:
      'A named state that changes what you can do — Prone, Grappled, Frightened, Blinded and eleven more — each with an exact printed effect. Conditions do not stack with themselves, and most of them end when whatever caused them ends.',
    seeAlso: ['exhaustion', 'disadvantage', 'saving-throw'],
  },
  {
    index: 'exhaustion',
    term: 'Exhaustion',
    definition:
      'The one condition that stacks, counted in levels from one to six, and in the 2024 rules each level is simply −2 to every D20 Test and −5 feet of speed. Six levels kills you, and a long rest removes one.',
    seeAlso: ['condition', 'long-rest', 'speed', 'd20-test'],
  },
  {
    index: 'death-saving-throw',
    term: 'Death saving throw',
    definition:
      'At zero hit points you roll a plain d20 at the start of each of your turns with no modifier: 10 or more is a success, 9 or less a failure, and you need three of either. A natural 20 puts you back up on one hit point, a natural 1 counts as two failures, and any healing at all cancels the whole thing.',
    seeAlso: ['hit-points', 'saving-throw'],
  },

  // ── Spellcasting ────────────────────────────────────────────────────────
  {
    index: 'spell-slot',
    term: 'Spell slot',
    definition:
      'The fuel for casting: each spell of first level or higher spends a slot of its level or higher, and you get them back on a long rest. Slots are not spells — knowing a spell and having a slot left to cast it with are two separate things.',
    seeAlso: ['prepared-spell', 'cantrip', 'higher-level-spell', 'long-rest'],
  },
  {
    index: 'cantrip',
    term: 'Cantrip',
    definition:
      'A level 0 spell you can cast as often as you like, for ever, without spending a slot. Cantrips are what a caster does on a turn when the slots are gone, so pick at least one you would be happy casting every round.',
    seeAlso: ['spell-slot', 'spell-attack-roll'],
  },
  {
    index: 'prepared-spell',
    term: 'Prepared spell',
    definition:
      'The spells you have chosen to have ready today, drawn from your class list or spellbook, and they are the only ones you can cast. In the 2024 rules you swap your prepared spells when you finish a long rest.',
    seeAlso: ['spell-slot', 'long-rest', 'spellcasting-ability'],
  },
  {
    index: 'spellcasting-ability',
    term: 'Spellcasting ability',
    definition:
      'The one ability your class casts with — Intelligence for a wizard, Wisdom for a cleric or druid, Charisma for a bard, sorcerer, warlock or paladin. It sets your spell attack bonus and your spell save DC, so it is the score a caster raises first.',
    seeAlso: ['spell-save-dc', 'spell-attack-roll', 'ability-score'],
  },
  {
    index: 'spell-save-dc',
    term: 'Spell save DC',
    definition:
      'The number your targets have to beat when your spell makes them roll a saving throw: 8 plus your proficiency bonus plus your spellcasting ability modifier. You never roll for these spells — the target rolls against this fixed number.',
    seeAlso: ['saving-throw', 'spellcasting-ability', 'proficiency-bonus'],
  },
  {
    index: 'spell-attack-roll',
    term: 'Spell attack roll',
    definition:
      'The roll for spells that say "make a ranged spell attack": d20 plus your proficiency bonus plus your spellcasting ability modifier, against the target’s Armour Class. A spell either asks for this or asks for a saving throw, never both.',
    seeAlso: ['attack-roll', 'spell-save-dc', 'spellcasting-ability'],
  },
  {
    index: 'concentration',
    term: 'Concentration',
    definition:
      'Some spells keep going only while you concentrate, and you can concentrate on exactly one at a time — starting a second ends the first. Taking damage forces a Constitution saving throw against DC 10 or half the damage, whichever is higher, to keep it.',
    seeAlso: ['saving-throw', 'spell-slot', 'round'],
  },
  {
    index: 'higher-level-spell',
    term: 'Casting at a higher level',
    definition:
      'Spending a bigger slot than a spell needs to make it stronger, where the spell has a line saying what improves. Most damage spells add a die per level; many spells gain nothing at all, so check before spending the slot.',
    seeAlso: ['spell-slot', 'prepared-spell'],
  },
  {
    index: 'ritual',
    term: 'Ritual',
    definition:
      'A spell marked as a ritual can be cast without spending a slot if you take ten extra minutes over it. It is free utility outside combat and useless inside it.',
    seeAlso: ['spell-slot', 'prepared-spell'],
  },
  {
    index: 'spell-components',
    term: 'Components',
    definition:
      'What casting a spell physically takes: V for spoken words, S for a free hand’s gesture, M for a material. Costly materials, the ones with a price beside them, are the only ones you actually have to buy and track.',
    seeAlso: ['prepared-spell', 'ritual'],
  },
  {
    index: 'area-of-effect',
    term: 'Area of effect',
    definition:
      'The shape a spell covers — cone, cube, cylinder, line, emanation or sphere — measured in feet from a point you choose. Everyone inside it is affected, allies included, which is worth checking before you place a fireball.',
    seeAlso: ['saving-throw', 'spell-save-dc'],
  },

  // ── Between fights ──────────────────────────────────────────────────────
  {
    index: 'short-rest',
    term: 'Short rest',
    definition:
      'An hour of doing nothing much, during which you may spend hit dice to heal and some class features come back. It is the pause that makes a long adventuring day survivable, and beginner parties almost always take too few.',
    seeAlso: ['hit-dice', 'long-rest', 'hit-points'],
  },
  {
    index: 'long-rest',
    term: 'Long rest',
    definition:
      'Eight hours of sleep and light activity that restores all your hit points, all your spell slots, half your spent hit dice, and one level of exhaustion. You can only benefit from one per day.',
    seeAlso: ['short-rest', 'spell-slot', 'hit-dice', 'exhaustion'],
  },
  {
    index: 'attunement',
    term: 'Attunement',
    definition:
      'Some magic items only work for you after you spend a short rest bonding with them, and you can be attuned to three at once. Carrying a fourth attuned item does nothing until you drop one of the others.',
    seeAlso: ['short-rest'],
  },
]
