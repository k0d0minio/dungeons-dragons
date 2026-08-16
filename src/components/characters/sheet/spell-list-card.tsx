'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { togglePreparedSpell, type CombatState } from '@/lib/characters/combat'
import { formatReferenceIndex } from '@/lib/characters/display'
import {
  preparedSpellLimit,
  spellPreparationModel,
  type AbilityScores,
} from '@/lib/characters/rules'
import { useClassSpells } from '@/lib/dnd-api/swr-hooks'
import { cn } from '@/lib/utils'

interface SpellRow {
  index: string
  name: string
  /** `null` until the class spell list has loaded, or if it never does. */
  level: number | null
}

function heading(level: number | null): string {
  if (level === null) return 'Spells'
  return level === 0 ? 'Cantrips' : `Level ${level}`
}

function groupByLevel(rows: SpellRow[]) {
  const byLevel = new Map<number | null, SpellRow[]>()

  for (const spell of rows) {
    const bucket = byLevel.get(spell.level)
    if (bucket) bucket.push(spell)
    else byLevel.set(spell.level, [spell])
  }

  return (
    Array.from(byLevel.entries())
      // Anything the class list did not describe sorts last, under "Spells".
      .sort(([a], [b]) => (a ?? 99) - (b ?? 99))
      .map(([level, items]) => ({
        key: String(level),
        heading: heading(level),
        spells: [...items].sort((a, b) => a.name.localeCompare(b.name)),
      }))
  )
}

/**
 * The character's spells, each tapping through to the DND-003 detail view —
 * now split by preparation model (DND-036, D22):
 *
 * - **Known-casters** (bard, sorcerer, warlock, ranger — and non-casters):
 *   exactly the pre-DND-036 card. `knownSpellIndexes` listed, no toggles.
 * - **Class-list preparers** (cleric, druid, paladin): the *whole class list*
 *   with a Prepared toggle per spell — their known list is the class list, so
 *   there is nothing to pick at creation and everything to choose at dawn.
 * - **The wizard** (spellbook): `knownSpellIndexes` is the book, and the
 *   toggles ready a subset of it. No third list.
 *
 * The prepared count is held against `preparedSpellLimit` advisorily: the
 * header says "5 of 4 prepared" in a warning tone, it does not refuse the
 * fifth — a table ruling beats an app rule (same posture as attunement).
 */
export function SpellListCard({
  classIndex,
  level,
  scores,
  knownSpellIndexes,
  state,
  apply,
  editHref,
  onSelect,
}: {
  classIndex: string
  level: number
  scores: AbilityScores
  knownSpellIndexes: string[]
  state: CombatState
  apply: (transition: (state: CombatState) => CombatState) => void
  /** Where the empty state sends a player who wants to add some (DND-018). */
  editHref: string
  onSelect: (spell: { index: string; name: string }) => void
}) {
  const model = spellPreparationModel(classIndex)
  const prepared = state.preparedSpellIndexes

  const wantsClassList = model === 'class-list' || knownSpellIndexes.length > 0
  const { spells, isLoading } = useClassSpells(wantsClassList ? classIndex : null)

  const rows: SpellRow[] = useMemo(() => {
    const reference = new Map(spells.map((spell) => [spell.index, spell]))

    // Class-list preparers read the whole class list; everyone else reads what
    // the character knows. Either way a stored index the reference list does
    // not describe still renders, so a slow API costs a heading, not a spell.
    const indexes =
      model === 'class-list'
        ? Array.from(new Set([...spells.map((spell) => spell.index), ...prepared]))
        : knownSpellIndexes

    return indexes.map((index) => {
      const match = reference.get(index)

      return {
        index,
        name: match?.name ?? formatReferenceIndex(index),
        level: typeof match?.level === 'number' ? match.level : null,
      }
    })
  }, [spells, knownSpellIndexes, prepared, model])

  const groups = useMemo(() => groupByLevel(rows), [rows])

  const limit = model === null ? null : preparedSpellLimit(classIndex, level, scores)
  const overLimit = limit !== null && prepared.length > limit

  const empty = rows.length === 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Spells
          {model !== null ? (
            <span
              className={cn(
                'ml-2 text-sm font-normal',
                overLimit ? 'text-amber-600' : 'text-muted-foreground',
              )}
            >
              {limit !== null
                ? `${prepared.length} of ${limit} prepared`
                : `${prepared.length} prepared`}
            </span>
          ) : knownSpellIndexes.length > 0 ? (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {knownSpellIndexes.length}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {overLimit ? (
          <p className="mb-2 text-xs text-amber-600" role="status">
            More prepared than your usual limit of {limit} — fine if a feature says so.
          </p>
        ) : null}

        {empty ? (
          model === 'class-list' && isLoading ? (
            <p className="text-muted-foreground text-sm" role="status">
              Loading the class spell list…
            </p>
          ) : model === 'class-list' ? (
            <p className="text-muted-foreground text-sm">
              Could not load the class spell list. Reload to prepare spells.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              No spells on this character.{' '}
              <Link href={editHref} className="text-foreground underline underline-offset-4">
                Edit the character
              </Link>{' '}
              to choose some.
            </p>
          )
        ) : (
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-muted-foreground text-xs" role="status">
                Loading spell names…
              </p>
            ) : null}

            {model === 'spellbook' ? (
              <p className="text-muted-foreground text-xs">
                Your spellbook. Tick what you prepare for the day.
              </p>
            ) : null}

            {groups.map((group) => (
              <section key={group.key}>
                <h3 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                  {group.heading}
                </h3>
                <ul>
                  {group.spells.map((spell) => (
                    <li key={spell.index} className="flex items-center gap-1">
                      {/* The name is the detail tap, exactly as before; the
                          checkbox beside it is the preparation toggle. */}
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-11 min-w-0 flex-1 justify-start px-2 text-sm font-normal"
                        onClick={() => onSelect({ index: spell.index, name: spell.name })}
                      >
                        <span className="truncate">{spell.name}</span>
                      </Button>
                      {model !== null ? (
                        <label className="flex size-11 shrink-0 items-center justify-center">
                          <Checkbox
                            className="size-5"
                            aria-label={`Prepare ${spell.name}`}
                            checked={prepared.includes(spell.index)}
                            onCheckedChange={() =>
                              apply((current) => togglePreparedSpell(current, spell.index))
                            }
                          />
                        </label>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
