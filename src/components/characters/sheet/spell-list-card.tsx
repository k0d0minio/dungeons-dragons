'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatReferenceIndex } from '@/lib/characters/display'
import { useClassSpells } from '@/lib/dnd-api/swr-hooks'

interface KnownSpell {
  index: string
  name: string
  /** `null` until the class spell list has loaded, or if it never does. */
  level: number | null
}

function heading(level: number | null): string {
  if (level === null) return 'Spells'
  return level === 0 ? 'Cantrips' : `Level ${level}`
}

/**
 * The character's spells, each tapping through to the DND-003 detail view.
 *
 * Names and levels come from `/api/dnd5e/classes/[index]/spells` — the same
 * list the DND-008 picker chose from — so the sheet gets "Sleight of Hand"
 * rather than a slug, and can group by level without eighteen detail fetches.
 * When that request has not landed (or fails), the stored indexes still render
 * as tappable rows: the detail sheet fetches by index anyway, so a slow
 * reference API costs a nice heading, not the feature.
 */
export function SpellListCard({
  classIndex,
  knownSpellIndexes,
  editHref,
  onSelect,
}: {
  classIndex: string
  knownSpellIndexes: string[]
  /** Where the empty state sends a player who wants to add some (DND-018). */
  editHref: string
  onSelect: (spell: { index: string; name: string }) => void
}) {
  const { spells, isLoading } = useClassSpells(knownSpellIndexes.length > 0 ? classIndex : null)

  const groups = useMemo(() => {
    const reference = new Map(spells.map((spell) => [spell.index, spell]))

    const known: KnownSpell[] = knownSpellIndexes.map((index) => {
      const match = reference.get(index)

      return {
        index,
        name: match?.name ?? formatReferenceIndex(index),
        level: typeof match?.level === 'number' ? match.level : null,
      }
    })

    const byLevel = new Map<number | null, KnownSpell[]>()

    for (const spell of known) {
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
  }, [spells, knownSpellIndexes])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Spells
          {knownSpellIndexes.length > 0 ? (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {knownSpellIndexes.length}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {knownSpellIndexes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No spells on this character.{' '}
            <Link href={editHref} className="text-foreground underline underline-offset-4">
              Edit the character
            </Link>{' '}
            to choose some.
          </p>
        ) : (
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-muted-foreground text-xs" role="status">
                Loading spell names…
              </p>
            ) : null}

            {groups.map((group) => (
              <section key={group.key}>
                <h3 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                  {group.heading}
                </h3>
                <ul>
                  {group.spells.map((spell) => (
                    <li key={spell.index}>
                      {/* The whole row is the target, left-aligned, 44px tall. */}
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-11 w-full justify-start px-2 text-sm font-normal"
                        onClick={() => onSelect({ index: spell.index, name: spell.name })}
                      >
                        {spell.name}
                      </Button>
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
