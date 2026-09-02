'use client'

import Link from 'next/link'

import { curatedSpells, startingSpellCounts, type WizardChoices } from '@/lib/characters/wizard'
import { spellPreparationModel } from '@/lib/characters/rules'
import { SPELL_IN_PLAY } from '@/lib/srd/in-play'
import { spellsForClass } from '@/lib/srd/spells'
import { cn } from '@/lib/utils'

import { AdvancedDetail } from '../sheet/advanced-detail'
import { OptionChecklist } from './option-checklist'
import type { WizardOption } from './option-row'

/**
 * The class's spells at one level as option cards, suggestions first and then
 * the rest by name.
 *
 * Only the curated hand carries a consequence line: those are the spells the
 * step actually puts in front of a first-time caster, and the rest of a class's
 * list arrives behind an Advanced tap for the player who already knows what
 * they want (`src/lib/srd/in-play.ts` explains why the line stops there).
 */
function choicesAt(
  classIndex: string,
  level: number,
  suggested: readonly string[],
): WizardOption[] {
  const order = new Map(suggested.map((index, position) => [index, position]))

  return spellsForClass(classIndex)
    .filter((spell) => spell.level === level)
    .map((spell) => ({
      value: spell.index,
      title: spell.name,
      inPlay: SPELL_IN_PLAY[spell.index],
      recommended: order.has(spell.index),
    }))
    .sort((a, b) => {
      const rankA = order.get(a.value) ?? Number.MAX_SAFE_INTEGER
      const rankB = order.get(b.value) ?? Number.MAX_SAFE_INTEGER
      return rankA === rankB ? a.title.localeCompare(b.title) : rankA - rankB
    })
}

/**
 * Step 7, casters only: the spells this character walks in with.
 *
 * The single loudest finding in the research is that four hundred spells in
 * front of a first-time player is not a choice, it is a wall — so the suggested
 * handful is pre-ticked and shown alone, each with a line saying what casting it
 * actually does (an attack roll, a save, a bonus action, a reaction), and the
 * rest of the class's list sits behind one Advanced tap per group. Nothing is
 * hidden; it is just not first.
 *
 * Read off the local SRD data rather than fetched: the spell list has been a
 * local module since `srd-2024-migration/long-tail-reference-data`, so this
 * step has nothing to wait for and no loading state to get wrong.
 */
export function SpellsStep({
  choices,
  onChange,
}: {
  choices: WizardChoices
  onChange: (next: WizardChoices) => void
}) {
  const counts = startingSpellCounts(choices.classIndex)
  const suggested = curatedSpells(choices.classIndex)
  const spellbook = spellPreparationModel(choices.classIndex) === 'spellbook'
  const levelOneAllowance = spellbook ? counts.spellbook : counts.prepared

  const groups = [
    {
      key: 'cantrips',
      title: 'Cantrips',
      blurb: 'Small spells you can cast as often as you like, forever.',
      allowance: counts.cantrips,
      picked: choices.cantripIndexes,
      options: choicesAt(choices.classIndex, 0, suggested.cantrips),
      apply: (next: string[]) => onChange({ ...choices, cantripIndexes: next }),
    },
    {
      key: 'level-1',
      title: spellbook ? 'Spells in your spellbook' : 'Spells you can prepare',
      blurb: spellbook
        ? 'Your book. Which of them you have ready each day is chosen on your sheet.'
        : 'Each one costs a spell slot to cast, and you get them back on a long rest.',
      allowance: levelOneAllowance,
      picked: choices.levelOneSpellIndexes,
      options: choicesAt(choices.classIndex, 1, suggested.level1),
      apply: (next: string[]) => onChange({ ...choices, levelOneSpellIndexes: next }),
    },
  ].filter((group) => group.allowance > 0)

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const picked = new Set(group.picked)
        const toggle = (index: string) =>
          group.apply(
            picked.has(index)
              ? group.picked.filter((chosen) => chosen !== index)
              : [...group.picked, index],
          )

        const suggestedOptions = group.options.filter((option) => option.recommended)
        const rest = group.options.filter((option) => !option.recommended)

        return (
          <section key={group.key} className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-medium">{group.title}</h3>
              <span
                className={cn(
                  'text-xs',
                  group.picked.length > group.allowance ? 'text-gold' : 'text-muted-foreground',
                )}
              >
                {group.picked.length} of {group.allowance}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">{group.blurb}</p>

            <OptionChecklist
              name={group.key}
              legend={`Suggested ${group.title.toLowerCase()}`}
              options={suggestedOptions}
              values={group.picked}
              onToggle={toggle}
            />

            {rest.length > 0 ? (
              <AdvancedDetail
                label={`All ${group.title.toLowerCase()} your class can learn`}
                summary={`${rest.length} more to choose from.`}
                // Already-picked spells from outside the suggestions have to be
                // visible, or unticking one would mean hunting for it.
                relevant={rest.some((option) => picked.has(option.value))}
              >
                <OptionChecklist
                  name={group.key}
                  legend={`Every ${group.title.toLowerCase()} on your class list`}
                  options={rest}
                  values={group.picked}
                  onToggle={toggle}
                />
              </AdvancedDetail>
            ) : null}
          </section>
        )
      })}

      <p className="text-muted-foreground text-xs">
        Every spell here is in{' '}
        <Link href="/library" className="underline underline-offset-4">
          the library
        </Link>{' '}
        in full, and on your sheet once the character exists.
      </p>
    </div>
  )
}
