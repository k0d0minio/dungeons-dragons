'use client'

import { SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClassSpells, type SpellRow } from '@/lib/srd/hooks'

function levelHeading(level: number): string {
  return level === 0 ? 'Cantrips' : `Level ${level}`
}

/** Spells grouped by level, lowest first, alphabetical within a level. */
function groupByLevel(spells: SpellRow[]) {
  const groups = new Map<number, SpellRow[]>()

  for (const spell of spells) {
    const level = spell.level
    const bucket = groups.get(level)
    if (bucket) bucket.push(spell)
    else groups.set(level, [spell])
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([level, items]) => ({
      level,
      heading: levelHeading(level),
      spells: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

/**
 * The character's spell list, filtered to what their class can cast (DND-008).
 *
 * Selection is stored as SRD index strings — the same identifiers
 * `/api/srd/spells/[index]` serves — so the sheet can tap through to the full
 * spell detail without a lookup table of our own.
 *
 * Deselected-by-search is not deselected: filtering narrows what is on screen
 * and never touches `value`, which is why the header keeps a running count of
 * everything chosen rather than only what is visible.
 */
export function SpellPicker({
  classIndex,
  classLabel,
  value,
  onChange,
}: {
  /** SRD class index, or `''` when the player has not picked one yet. */
  classIndex: string
  /** The class's display name, for the empty states. */
  classLabel?: string
  value: string[]
  onChange: (next: string[]) => void
}) {
  const { spells, isLoading, error } = useClassSpells(classIndex || null)
  const [query, setQuery] = useState('')

  const selected = useMemo(() => new Set(value), [value])

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matches = needle
      ? spells.filter((spell) => spell.name.toLowerCase().includes(needle))
      : spells

    return groupByLevel(matches)
  }, [spells, query])

  function toggle(index: string) {
    onChange(selected.has(index) ? value.filter((chosen) => chosen !== index) : [...value, index])
  }

  const label = classLabel || 'This class'

  if (!classIndex) {
    return (
      <p className="text-muted-foreground text-sm">
        Pick a class first — the spell list is filtered to what it can cast.
      </p>
    )
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading {label}&rsquo;s spells…</p>
  }

  if (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Could not load the spell list. You can save the character and add spells later.
      </p>
    )
  }

  if (spells.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{label} has no spells in the reference data.</p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {value.length} selected
        </p>
        {value.length > 0 ? (
          <Button type="button" variant="ghost" className="h-11 px-3" onClick={() => onChange([])}>
            Clear
          </Button>
        ) : null}
      </div>

      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          className="h-11 pl-9"
          placeholder={`Search ${spells.length} spells`}
          aria-label="Search spells"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">No spell matches “{query.trim()}”.</p>
      ) : (
        // Capped height so the picker cannot push the submit button off a phone
        // screen; the list scrolls inside it.
        <div className="max-h-96 overflow-y-auto overscroll-contain rounded-md border p-1">
          {groups.map((group) => (
            <section key={group.level} className="mb-2 last:mb-0">
              <h4 className="text-muted-foreground bg-background sticky top-0 px-2 py-1.5 text-xs font-medium tracking-wide uppercase">
                {group.heading}
              </h4>
              <ul>
                {group.spells.map((spell) => {
                  const id = `spell-${spell.index}`

                  return (
                    <li
                      key={spell.index}
                      className="hover:bg-accent flex items-center gap-3 rounded-md px-2"
                    >
                      <Checkbox
                        id={id}
                        className="size-5"
                        checked={selected.has(spell.index)}
                        onCheckedChange={() => toggle(spell.index)}
                      />
                      {/* The label fills the row, so the whole 44px strip is the tap target. */}
                      <Label
                        htmlFor={id}
                        className="min-h-11 flex-1 items-center text-sm font-normal"
                      >
                        {spell.name}
                      </Label>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
