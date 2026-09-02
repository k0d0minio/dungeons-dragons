'use client'

import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { curatedSpells, startingSpellCounts, type WizardChoices } from '@/lib/characters/wizard'
import { spellPreparationModel } from '@/lib/characters/rules'
import { spellsForClass } from '@/lib/srd/spells'
import { cn } from '@/lib/utils'

import { AdvancedDetail } from '../sheet/advanced-detail'

interface SpellChoice {
  index: string
  name: string
  suggested: boolean
}

/** One tappable spell row — the whole row, not the box. */
function SpellRow({
  id,
  spell,
  checked,
  onToggle,
}: {
  id: string
  spell: SpellChoice
  checked: boolean
  onToggle: () => void
}) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-2.5 font-normal',
        checked ? 'border-primary bg-accent/50' : 'hover:bg-accent/30',
      )}
    >
      <Checkbox id={id} checked={checked} onCheckedChange={onToggle} />
      <span className="min-w-0 flex-1 truncate">{spell.name}</span>
      {spell.suggested ? (
        <Badge variant="secondary" className="shrink-0">
          Suggested
        </Badge>
      ) : null}
    </Label>
  )
}

/** The class's spells at one level, suggestions first, then the rest by name. */
function choicesAt(classIndex: string, level: number, suggested: readonly string[]): SpellChoice[] {
  const order = new Map(suggested.map((index, position) => [index, position]))

  return spellsForClass(classIndex)
    .filter((spell) => spell.level === level)
    .map((spell) => ({ index: spell.index, name: spell.name, suggested: order.has(spell.index) }))
    .sort((a, b) => {
      const rankA = order.get(a.index) ?? Number.MAX_SAFE_INTEGER
      const rankB = order.get(b.index) ?? Number.MAX_SAFE_INTEGER
      return rankA === rankB ? a.name.localeCompare(b.name) : rankA - rankB
    })
}

/**
 * Step 7, casters only: the spells this character walks in with.
 *
 * The single loudest finding in the research is that four hundred spells in
 * front of a first-time player is not a choice, it is a wall — so the suggested
 * handful is pre-ticked and shown alone, and the rest of the class's list sits
 * behind one Advanced tap per group. Nothing is hidden; it is just not first.
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

        const suggestedRows = group.options.filter((spell) => spell.suggested)
        const rest = group.options.filter((spell) => !spell.suggested)

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

            <div className="space-y-2">
              {suggestedRows.map((spell) => (
                <SpellRow
                  key={spell.index}
                  id={`${group.key}-${spell.index}`}
                  spell={spell}
                  checked={picked.has(spell.index)}
                  onToggle={() => toggle(spell.index)}
                />
              ))}
            </div>

            {rest.length > 0 ? (
              <AdvancedDetail
                label={`All ${group.title.toLowerCase()} your class can learn`}
                summary={`${rest.length} more to choose from.`}
                // Already-picked spells from outside the suggestions have to be
                // visible, or unticking one would mean hunting for it.
                relevant={rest.some((spell) => picked.has(spell.index))}
              >
                <div className="space-y-2">
                  {rest.map((spell) => (
                    <SpellRow
                      key={spell.index}
                      id={`${group.key}-${spell.index}`}
                      spell={spell}
                      checked={picked.has(spell.index)}
                      onToggle={() => toggle(spell.index)}
                    />
                  ))}
                </div>
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
