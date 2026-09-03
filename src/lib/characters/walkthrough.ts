// What to roll, and why — the explanation behind every number on the sheet
// (`learn-to-play/roll-walkthroughs`).
//
// A first-time player looking at "Longsword +5" knows neither which die that
// bonus goes on nor where the 5 came from nor what to compare the result
// against. This module turns each of those numbers into the four things they
// were missing: **the die to pick up**, **the modifier breakdown with the
// why**, **the target**, and **what happens next**.
//
// Two rules hold this module honest, and both are load-bearing:
//
// 1. **Never a parallel formula.** Every number here comes out of the rules
//    engine beside it — `weaponAttack`, `unarmedStrike`, `spellAttackBonus`,
//    `spellSaveDc`, `skillChecks`, `savingThrows`, `skillProficiency`,
//    `proficiencyBonus`, `abilityModifier`, `exhaustionD20Penalty`. The totals
//    are *taken* from the engine, not summed from the lines; the lines are
//    engine calls too, and `walkthrough.test.ts` holds every breakdown to
//    summing back to the engine's own answer. A walkthrough that quietly
//    recomputed `8 + prof + mod` would be a second rules engine, and the first
//    time the two disagreed the teaching surface would be the one lying.
// 2. **No rolling, no randomness** (register decision D8). There is no
//    `Math.random` in this file and there is not meant to be one: physical
//    dice are the point of a physical table. Everything here is a *statement*
//    about a roll the player makes with their own hands.
//
// Pure and synchronous like the rest of `src/lib/characters/`: a character row
// (plus, for a spell, the SRD spell) goes in, a description comes out. Nothing
// is fetched, nothing is stored, and the same input always gives the same
// text — which is what makes the whole thing unit-testable against the engine.
import type { SrdSpell } from '@/lib/srd/types'
import { formatSpellLevel, spellDamageAtSlotLevel } from '@/lib/srd/format'

import {
  spellAttackBonus,
  spellSaveDc,
  unarmedStrike,
  weaponAttack,
  type AttackFields,
  type WeaponDetails,
} from './attacks'
import { abilityModifier } from './display'
import {
  ABILITIES,
  SKILLS,
  exhaustionD20Penalty,
  isAbilityKey,
  proficiencyBonus,
  savingThrows,
  skillChecks,
  skillProficiency,
  spellcastingAbility,
  type AbilityKey,
  type AbilityScores,
  type SkillSelections,
} from './rules'

/** What kind of roll is being explained — the UI colours nothing by it, but a caller may branch. */
export type WalkthroughKind =
  'attack' | 'spell-attack' | 'spell-save' | 'spell-effect' | 'check' | 'save'

/** The die a player picks up, and why that one. */
export interface WalkthroughDie {
  /** As it reads on the die itself: `d20`, or `2d6` for a handful. */
  notation: string
  /** Why this die and not another. */
  why: string
}

/** One line of the breakdown: what it adds, and on what grounds. */
export interface WalkthroughModifier {
  label: string
  /** Signed; `0` lines are kept deliberately — "nothing, because…" teaches too. */
  value: number
  why: string
  /** Glossary index for the term on this line, when it has one. */
  term?: string
}

/** What the total is compared against once the die has landed. */
export interface WalkthroughTarget {
  label: string
  /** The number, when the sheet legitimately knows it; `null` when the DM holds it. */
  value: number | null
  detail: string
  term?: string
}

/** What happens after — the damage, the effect, the slot, the concentration. */
export interface WalkthroughOutcome {
  label: string
  detail: string
  /** Dice to pick up for this step, when it calls for any: `1d8+3 slashing`. */
  dice?: string
  term?: string
}

/**
 * One explained roll, ready to render.
 *
 * `total` is `null` for the things that involve no d20 of the character's own
 * — a Cure Wounds, a Bless — where a "+0" would be a lie about there being a
 * roll at all.
 */
export interface RollWalkthrough {
  kind: WalkthroughKind
  /** What was tapped: `Longsword`, `Stealth`, `Dexterity`. */
  title: string
  /** What kind of roll it is: `Attack roll`, `Ability check`. */
  subtitle: string
  /** Glossary index for the subtitle's term. */
  term?: string
  /** The die to pick up, or `null` when this character rolls nothing. */
  die: WalkthroughDie | null
  /** The breakdown. Always sums to `total` when `total` is not `null`. */
  modifiers: WalkthroughModifier[]
  total: number | null
  target: WalkthroughTarget | null
  outcomes: WalkthroughOutcome[]
  /** Caveats and asides — what the sheet is assuming, what else to know. */
  notes: string[]
}

/**
 * The columns a check walkthrough needs: everything an attack needs, plus the
 * stored skill picks. A `Character` row satisfies it whole.
 */
export type WalkthroughFields = AttackFields & SkillSelections

/** The d20 line, worded the same way wherever a D20 Test is being explained. */
const D20: WalkthroughDie = {
  notation: 'd20',
  why: 'The twenty-sided one. Roll it once, then add the numbers below to whatever it shows.',
}

function abilityLabel(ability: AbilityKey): string {
  return ABILITIES.find((entry) => entry.key === ability)?.label ?? ability
}

function scoresOf(character: AttackFields): AbilityScores {
  return {
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
  }
}

/**
 * The Exhaustion line, or nothing when the character has none.
 *
 * Returned as an array so a caller can spread it into the breakdown without a
 * conditional: an unexhausted character should see no line at all rather than
 * a "−0" that reads like a penalty.
 */
function exhaustionLine(exhaustion: number): WalkthroughModifier[] {
  const penalty = exhaustionD20Penalty(exhaustion)
  if (penalty === 0) return []

  return [
    {
      label: 'Exhaustion',
      value: penalty,
      why: `Exhaustion takes 2 off every d20 roll for each level of it, and you have ${exhaustion}.`,
      term: 'exhaustion',
    },
  ]
}

/** The proficiency line as an attack roll gets it — always added, see below. */
function attackProficiencyLine(level: number, why: string): WalkthroughModifier {
  return {
    label: 'Proficiency',
    value: proficiencyBonus(level),
    why,
    term: 'proficiency-bonus',
  }
}

/** The AC line every attack roll is compared against, whoever is swinging. */
const ARMOUR_CLASS_TARGET: WalkthroughTarget = {
  label: "The target's Armour Class",
  value: null,
  detail:
    'Your DM knows the number and will usually just say hit or miss. Equal to their AC or higher hits.',
  term: 'armour-class',
}

/** The natural-20 line, the same on every attack roll. */
const CRITICAL_HIT: WalkthroughOutcome = {
  label: 'If the d20 shows a 20',
  detail:
    'A critical hit, whatever their AC. Roll the damage dice twice and add your modifier once — the modifier is not doubled.',
  term: 'critical-hit',
}

/** The advantage aside, worded once for every D20 Test that can carry it. */
const ADVANTAGE_NOTE =
  'If your DM gives you advantage or disadvantage, roll two d20s and take the higher or the lower. Everything you add stays the same.'

// ---------------------------------------------------------------------------
// Attacks
// ---------------------------------------------------------------------------

/**
 * A weapon attack explained, from the same {@link weaponAttack} row the
 * Attacks card prints its bonus from.
 *
 * The ability line's *why* is the interesting part, and it is read off the
 * engine's own `ability` and `finesse` flags rather than re-decided here: a
 * finesse weapon says the rule out loud ("either one, so the sheet took your
 * better"), a plain melee or ranged weapon says which one and why it is that
 * one. The proficiency line carries the module-level assumption from
 * `attacks.ts` in words — the player is told the sheet is assuming it, so a
 * table that rules otherwise knows exactly which line to ignore.
 */
export function weaponAttackWalkthrough(
  character: AttackFields,
  weapon: WeaponDetails,
  name?: string,
): RollWalkthrough {
  const attack = weaponAttack(character, weapon, name)
  const modifier = abilityModifier(scoresOf(character)[attack.ability])
  const ability = abilityLabel(attack.ability)

  const why = attack.finesse
    ? `${ability}. This weapon has Finesse, so you may use either Strength or Dexterity — the sheet has taken whichever of yours is better.`
    : attack.ranged
      ? `${ability}. A ranged weapon uses how steady your hands are, not how hard you swing.`
      : `${ability}. A melee weapon uses how hard you swing.`

  const outcomes: WalkthroughOutcome[] = []

  if (attack.damage) {
    outcomes.push({
      label: 'On a hit',
      dice: attack.damage,
      detail:
        'The same ability modifier you added to the attack is added to the damage. Your proficiency bonus is not — that one is only for hitting.',
    })
  } else {
    outcomes.push({
      label: 'On a hit',
      detail: 'This one deals no damage of its own. Read what the weapon does instead.',
    })
  }

  if (attack.versatileDamage) {
    outcomes.push({
      label: 'Held in two hands',
      dice: attack.versatileDamage,
      detail:
        'Versatile: a free hand on the grip makes the damage die bigger. Nothing else changes.',
    })
  }

  outcomes.push(CRITICAL_HIT)

  if (attack.mastery?.available) {
    outcomes.push({
      label: `Mastery: ${attack.mastery.name}`,
      detail: attack.mastery.description,
      term: 'weapon-mastery',
    })
  }

  const notes = ['The sheet assumes you are proficient with whatever you have equipped.']
  if (attack.mastery && !attack.mastery.available) {
    notes.push(
      `This weapon has the ${attack.mastery.name} mastery property, but your class does not have the Weapon Mastery feature — so it is not yours to use.`,
    )
  }
  notes.push(ADVANTAGE_NOTE)

  return {
    kind: 'attack',
    title: attack.name,
    subtitle: 'Attack roll',
    term: 'attack-roll',
    die: D20,
    modifiers: [
      { label: ability, value: modifier, why, term: 'modifier' },
      attackProficiencyLine(
        character.level,
        'You are proficient with this weapon, so your whole proficiency bonus is added.',
      ),
      ...exhaustionLine(character.exhaustion),
    ],
    total: attack.attackBonus,
    target: ARMOUR_CLASS_TARGET,
    outcomes,
    notes,
  }
}

/**
 * The Unarmed Strike explained: the one attack every character always has, and
 * the one whose damage is not dice at all.
 *
 * Grapple and Shove get a line of their own because they are what an Unarmed
 * Strike is usually reached for, and because their DC is a number on this row
 * that appears nowhere else on the sheet.
 */
export function unarmedStrikeWalkthrough(character: AttackFields): RollWalkthrough {
  const strike = unarmedStrike(character)
  const modifier = abilityModifier(character.strength)

  return {
    kind: 'attack',
    title: 'Unarmed strike',
    subtitle: 'Attack roll',
    term: 'attack-roll',
    die: D20,
    modifiers: [
      {
        label: 'Strength',
        value: modifier,
        why: 'Strength, always — a punch has no Finesse option however nimble you are.',
        term: 'modifier',
      },
      attackProficiencyLine(
        character.level,
        'Everyone is proficient with their own hands, so your whole proficiency bonus is added.',
      ),
      ...exhaustionLine(character.exhaustion),
    ],
    total: strike.attackBonus,
    target: ARMOUR_CLASS_TARGET,
    outcomes: [
      {
        label: 'On a hit',
        detail: `${strike.damage} bludgeoning damage — no die for this one, it is a flat number: 1 plus your Strength modifier.`,
      },
      CRITICAL_HIT,
      {
        label: 'Or Grapple, or Shove',
        detail: `Instead of damage you can grab them or push them. No roll from you: they make a Strength or Dexterity saving throw against DC ${strike.saveDc}, and it only works if they fail.`,
        term: 'saving-throw',
      },
    ],
    notes: [ADVANTAGE_NOTE],
  }
}

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

/**
 * The spell attack bonus explained, with no particular spell in mind — what
 * the Attacks card's "Spell attack" row means.
 *
 * `null` for a class that casts nothing, which is the same answer
 * {@link spellAttackBonus} gives and for the same reason: there is no casting
 * ability to explain.
 */
export function spellAttackWalkthrough(character: AttackFields): RollWalkthrough | null {
  const bonus = spellAttackBonus(character)
  const ability = spellcastingAbility(character.classIndex)
  if (bonus === null || ability === null) return null

  const dc = spellSaveDc(character)

  return {
    kind: 'spell-attack',
    title: 'Spell attack',
    subtitle: 'Attack roll',
    term: 'spell-attack-roll',
    die: D20,
    modifiers: [...spellAbilityLines(character, ability), ...exhaustionLine(character.exhaustion)],
    total: bonus,
    target: ARMOUR_CLASS_TARGET,
    outcomes: [
      {
        label: 'On a hit',
        detail: 'The spell itself says what it does and how much. Open the spell to read it.',
      },
      CRITICAL_HIT,
    ],
    notes: [
      ...(dc === null
        ? []
        : [
            `This is the bonus for spells that say "make a spell attack". Spells that instead make someone else roll use your spell save DC of ${dc}.`,
          ]),
      ADVANTAGE_NOTE,
    ],
  }
}

/** The two lines every spell number is built from: casting ability, then proficiency. */
function spellAbilityLines(character: AttackFields, ability: AbilityKey): WalkthroughModifier[] {
  return [
    {
      label: abilityLabel(ability),
      value: abilityModifier(scoresOf(character)[ability]),
      why: `${abilityLabel(ability)} is your spellcasting ability — the one your class casts with, whatever your other scores say.`,
      term: 'spellcasting-ability',
    },
    attackProficiencyLine(
      character.level,
      'Your proficiency bonus goes on everything your own magic does.',
    ),
  ]
}

/**
 * One spell explained end to end (`learn-to-play/roll-walkthroughs`): which of
 * the three shapes it is, what to roll, and the bookkeeping it costs.
 *
 * The three shapes come off the spell's own SRD columns rather than a guess:
 *
 * - `attackRoll` — the caster rolls a d20 against the target's AC.
 * - `savingThrow` — the *target* rolls, against this caster's save DC. The
 *   caster picks up no die at all, which is precisely the thing new players
 *   get wrong, so the sheet says so in the die slot rather than leaving it out.
 * - neither — Cure Wounds, Bless, Shield. Nothing to hit, nothing to resist;
 *   `total` is `null` because printing "+0" would invent a roll.
 *
 * `slotLevel` is the level the spell is being cast at, which the cast flow
 * already knows: it picks the right "At Higher Levels" row for the damage and
 * the right slot to tell the player to mark off. Pass `null` (or a cantrip)
 * and the slot line says a cantrip costs nothing.
 */
export function spellWalkthrough(
  character: AttackFields,
  spell: SrdSpell,
  slotLevel: number | null = null,
): RollWalkthrough {
  const ability = spellcastingAbility(character.classIndex)
  const cantrip = spell.level === 0
  const castAt = cantrip ? 0 : (slotLevel ?? spell.level)

  const outcomes: WalkthroughOutcome[] = []
  const notes: string[] = []

  const damage = spellDamageAtSlotLevel(spell, castAt)
  const damageType = spell.damageTypes[0]

  if (damage) {
    outcomes.push({
      label: castAt > spell.level ? `Damage at level ${castAt}` : 'Damage',
      dice: damageType ? `${damage} ${damageType}` : damage,
      detail:
        castAt > spell.level
          ? 'Upcast: the bigger slot buys the bigger handful of dice. Count them out before you roll.'
          : 'Roll them all together and add them up. Your spellcasting modifier is not added unless the spell says so.',
    })
  } else if (castAt > spell.level) {
    // Upcast into a spell the SRD prints no damage table for — most of them.
    // Saying so beats an empty space where a player expects a bigger number.
    outcomes.push({
      label: `Upcast to level ${castAt}`,
      detail:
        'No damage table for this one — read the spell for what the bigger slot buys. Plenty scale by targets or duration instead of dice.',
    })
  }

  outcomes.push(
    cantrip
      ? {
          label: 'Slot cost',
          detail: 'None. A cantrip is free — cast it as often as you like, all day.',
          term: 'cantrip',
        }
      : {
          label: 'Slot cost',
          detail: `Mark off one level-${castAt} spell slot. You spend it whether or not the spell does anything.`,
          term: 'spell-slot',
        },
  )

  if (spell.concentration) {
    outcomes.push({
      label: 'Concentration',
      detail:
        'Only one concentration spell at a time — starting this one ends any other you have going. If you take damage while it runs, make a Constitution saving throw against DC 10, or half the damage taken if that is higher, or it ends.',
      term: 'concentration',
    })
  }

  if (spell.ritual) {
    notes.push(
      'Ritual: you can cast this without spending a slot if you take ten minutes longer over it.',
    )
  }
  notes.push(`Casting time ${spell.castingTime}. Range ${spell.range}. Duration ${spell.duration}.`)

  if (spell.attackRoll && ability !== null) {
    const bonus = spellAttackBonus(character)

    return {
      kind: 'spell-attack',
      title: spell.name,
      subtitle: `${formatSpellLevel(spell.level)} — spell attack`,
      term: 'spell-attack-roll',
      die: D20,
      modifiers: [
        ...spellAbilityLines(character, ability),
        ...exhaustionLine(character.exhaustion),
      ],
      total: bonus,
      target: ARMOUR_CLASS_TARGET,
      outcomes: [CRITICAL_HIT, ...outcomes],
      notes: [ADVANTAGE_NOTE, ...notes],
    }
  }

  if (spell.savingThrow && isAbilityKey(spell.savingThrow) && ability !== null) {
    const dc = spellSaveDc(character)
    const saveLabel = abilityLabel(spell.savingThrow)

    return {
      kind: 'spell-save',
      title: spell.name,
      subtitle: `${formatSpellLevel(spell.level)} — they save`,
      term: 'spell-save-dc',
      // The whole point of the branch: the caster picks up nothing.
      die: null,
      modifiers: [
        {
          label: 'Base',
          value: 8,
          why: 'Every spell save DC starts at 8. It is not a roll — the number is fixed and they roll against it.',
          term: 'spell-save-dc',
        },
        ...spellAbilityLines(character, ability),
      ],
      total: dc,
      target: {
        label: `Their ${saveLabel} saving throw`,
        value: dc,
        detail: `They roll a d20 and add their own ${saveLabel}. Equal to your DC or higher and they save; under it and the spell lands in full.`,
        term: 'saving-throw',
      },
      outcomes,
      notes: ['Exhaustion never lowers this number: a save DC is not a roll you make.', ...notes],
    }
  }

  return {
    kind: 'spell-effect',
    title: spell.name,
    subtitle: `${formatSpellLevel(spell.level)} — no roll to hit`,
    die: null,
    modifiers: [],
    total: null,
    target: null,
    outcomes: [
      {
        label: 'What it does',
        detail:
          'Nothing to hit and nothing to resist — it simply happens. Open the spell to read what.',
      },
      ...outcomes,
    ],
    notes,
  }
}

// ---------------------------------------------------------------------------
// Checks and saves
// ---------------------------------------------------------------------------

/** The proficiency line of a skill check, in the words of whichever rule granted it. */
function skillProficiencyLine(
  skillIndex: string,
  classIndex: string,
  selections: SkillSelections,
): WalkthroughModifier {
  const { source, bonus } = skillProficiency(skillIndex, classIndex, selections)

  switch (source) {
    case 'expertise':
      return {
        label: 'Expertise',
        value: bonus,
        why: 'Expertise: your proficiency bonus counts twice here. This is the best you get at anything.',
        term: 'expertise',
      }
    case 'proficient':
      return {
        label: 'Proficiency',
        value: bonus,
        why: 'You are proficient in this skill, so your whole proficiency bonus is added.',
        term: 'proficiency',
      }
    case 'jack-of-all-trades':
      return {
        label: 'Jack of All Trades',
        value: bonus,
        why: 'Half your proficiency bonus, rounded down, on every check you are not already proficient in.',
        term: 'proficiency-bonus',
      }
    case 'none':
      return {
        label: 'Proficiency',
        value: bonus,
        why: 'You are not proficient in this skill, so nothing is added for it. You can still try.',
        term: 'proficiency',
      }
  }
}

/**
 * A skill check explained, from the same {@link skillChecks} row the Skills
 * card prints.
 *
 * `null` for an index SRD 5.2.1 has no skill for — the same fail-soft the rest
 * of the sheet takes with an index it does not recognise.
 */
export function skillCheckWalkthrough(
  character: WalkthroughFields,
  skillIndex: string,
): RollWalkthrough | null {
  const definition = SKILLS.find((skill) => skill.index === skillIndex)
  if (!definition) return null

  const check = skillChecks(scoresOf(character), character.classIndex, character).find(
    (skill) => skill.index === skillIndex,
  )
  if (!check) return null

  const ability = abilityLabel(definition.ability)

  return {
    kind: 'check',
    title: definition.label,
    subtitle: `${ability} check`,
    term: 'ability-check',
    die: D20,
    modifiers: [
      {
        label: ability,
        value: abilityModifier(scoresOf(character)[definition.ability]),
        why: `${definition.label} is a ${ability} skill — the ability is what you are made of, the skill is what you have practised.`,
        term: 'modifier',
      },
      skillProficiencyLine(skillIndex, character.classIndex, character),
      ...exhaustionLine(character.exhaustion),
    ],
    total: check.modifier,
    target: {
      label: 'The DC your DM sets',
      value: null,
      detail:
        'Your DM picks a Difficulty Class before you roll — 10 for something fiddly, 15 for hard, 20 for very hard. Equal to it or over and you have done it.',
      term: 'difficulty-class',
    },
    outcomes: [
      {
        label: 'Equal or over',
        detail: 'You do the thing. Your DM narrates what that looks like.',
      },
      {
        label: 'Under',
        detail:
          'You do not — which is rarely nothing happening. Ask what you learn from the attempt.',
      },
    ],
    notes: [ADVANTAGE_NOTE],
  }
}

/**
 * A saving throw explained, from the same {@link savingThrows} row the Saving
 * Throws card prints.
 *
 * The proficient/not line is the one that matters here: a class gets exactly
 * two of these and no choice about which, and the card's filled dot never says
 * so in words.
 */
export function savingThrowWalkthrough(
  character: AttackFields,
  ability: AbilityKey,
): RollWalkthrough | null {
  const save = savingThrows(
    scoresOf(character),
    character.classIndex,
    character.level,
    character.exhaustion,
  ).find((entry) => entry.ability === ability)
  if (!save) return null

  return {
    kind: 'save',
    title: `${save.label} save`,
    subtitle: 'Saving throw',
    term: 'saving-throw',
    die: D20,
    modifiers: [
      {
        label: save.label,
        value: abilityModifier(scoresOf(character)[ability]),
        why: `Whatever hit you named ${save.label}, so ${save.label} is what you resist it with.`,
        term: 'modifier',
      },
      save.proficient
        ? attackProficiencyLine(
            character.level,
            'Your class is proficient in this save — one of the two it gets — so your whole proficiency bonus is added.',
          )
        : {
            label: 'Proficiency',
            value: 0,
            why: 'Your class is not proficient in this save. Every class gets exactly two, and this is not one of yours.',
            term: 'proficiency-bonus',
          },
      ...exhaustionLine(character.exhaustion),
    ],
    total: save.modifier,
    target: {
      label: 'The DC of whatever hit you',
      value: null,
      detail:
        'The spell, trap or monster names its own DC — your DM will tell you the number or just say whether you made it. Equal or over and you save.',
      term: 'difficulty-class',
    },
    outcomes: [
      {
        label: 'On a save',
        detail:
          'Usually half damage, or the effect not landing at all. What exactly is in the thing you are saving against — it always says.',
      },
      {
        label: 'On a failure',
        detail: 'The full effect. Take the damage, or take the condition.',
      },
    ],
    notes: [ADVANTAGE_NOTE],
  }
}
