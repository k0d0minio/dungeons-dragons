'use client'

import { Info } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  CONCENTRATION_NAME_LIMIT,
  setConcentration,
  type CombatState,
} from '@/lib/characters/combat'
import { formatReferenceIndex } from '@/lib/characters/display'
import { spellPreparationModel } from '@/lib/characters/rules'
import { searchByName, useClassSpells } from '@/lib/srd/hooks'

/** What the picker offers before the box is typed in — enough to scan, not scroll. */
const PICKER_LIMIT = 12

/**
 * The one concentration effect a character has running (DND-049).
 *
 * Concentration is the most-forgotten rule at a real table, and it is *state*,
 * not rolling: the app remembers what is up and whose it is, and the physical
 * dice stay the point (D8). So this card holds one fact — the name of the thing
 * being concentrated on — and drops it in one tap. Nothing here rolls the
 * Constitution save, and nothing clears the flag on the player's behalf; the
 * automatic half (a damage prompt with the DC, auto-clear at 0 HP) is the
 * wired-in scope DND-049 deliberately did not take.
 *
 * Placed beside the spell slots rather than inside the conditions card: it is a
 * spellcasting state, it is asked about every time the character takes a hit,
 * and it has to be legible without scrolling to the middle of the sheet. The
 * DND-023 invariant is untouched — hit points stay first, slots stay above
 * conditions.
 *
 * **The picker is not filtered to concentration spells,** and cannot cheaply
 * be: neither `/spells` nor `/classes/{index}/spells` carries the
 * `concentration` flag — only the per-spell detail does — so filtering a
 * cleric's eighty prepared spells would be eighty fetches to open one card. It
 * offers the spells this character could have cast and trusts the player, who
 * has the spell in front of them, to know which of those needs concentrating
 * on. The free-text half is not a fallback either: a magic item, a monster's
 * effect or a readied spell all need concentrating on and none of them is on a
 * class list.
 */
export function ConcentrationCard({
  classIndex,
  knownSpellIndexes,
  state,
  apply,
  onSelect,
}: {
  classIndex: string
  knownSpellIndexes: string[]
  state: CombatState
  apply: (transition: (state: CombatState) => CombatState) => void
  /** Opens the reference detail for the spell being concentrated on. */
  onSelect: (spell: { index: string; name: string }) => void
}) {
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')

  const model = spellPreparationModel(classIndex)
  const { spells } = useClassSpells(classIndex)

  // What this character could have cast: what they have prepared if their class
  // prepares, what they know otherwise. Names come from the class list — the
  // same fetch the spell list card already made, so opening this card costs
  // nothing — and an index that list never described still shows, formatted.
  const candidates = useMemo(() => {
    const reference = new Map(spells.map((spell) => [spell.index, spell.name]))
    const indexes = model === null ? knownSpellIndexes : state.preparedSpellIndexes

    return Array.from(new Set(indexes))
      .map((index) => ({ index, name: reference.get(index) ?? formatReferenceIndex(index) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [spells, model, knownSpellIndexes, state.preparedSpellIndexes])

  const matches = useMemo(() => searchByName(candidates, query), [candidates, query])
  const typed = query.trim().slice(0, CONCENTRATION_NAME_LIMIT)

  // Free text is offered whenever what was typed is not already a row in the
  // list, so "Moonbeam" does not appear twice and "the DM's amulet" appears once.
  const exactMatch = candidates.some((spell) => spell.name.toLowerCase() === typed.toLowerCase())

  const active = state.concentration

  function start(concentration: { index: string | null; name: string }) {
    apply((current) => setConcentration(current, concentration))
    setQuery('')
    setPicking(false)
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Concentration</CardTitle>
        <Button
          type="button"
          variant="ghost"
          className="h-11 px-3"
          aria-expanded={picking}
          onClick={() => setPicking((open) => !open)}
        >
          {picking ? 'Done' : active ? 'Change' : 'Set'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {active ? (
          <div className="flex items-stretch gap-1.5">
            {/* The row is the drop: losing concentration is the thing that
                happens most often, and it must not cost a trip through the
                picker. Everything else about the card is secondary to this tap. */}
            <Button
              type="button"
              variant="secondary"
              className="h-auto min-h-11 min-w-0 flex-1 justify-start px-3 py-2 text-left whitespace-normal"
              onClick={() => apply((current) => setConcentration(current, null))}
            >
              <span>
                <span className="font-medium">{active.name}</span>{' '}
                <span className="text-muted-foreground text-sm">Tap to drop it.</span>
              </span>
            </Button>
            {active.index ? (
              <button
                type="button"
                aria-label={`${active.name} details`}
                className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring flex min-h-11 w-11 shrink-0 items-center justify-center rounded-md border focus-visible:ring-2 focus-visible:outline-none"
                onClick={() => onSelect({ index: active.index as string, name: active.name })}
              >
                <Info className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Not concentrating on anything.</p>
        )}

        {picking ? (
          <div className="space-y-2 border-t pt-3">
            <Input
              type="text"
              value={query}
              maxLength={CONCENTRATION_NAME_LIMIT}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a spell, or type anything"
              aria-label="Find a spell, or type what you are concentrating on"
              className="h-11"
            />

            <div className="flex flex-wrap gap-2">
              {typed && !exactMatch ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3 text-sm"
                  onClick={() => start({ index: null, name: typed })}
                >
                  Concentrate on “{typed}”
                </Button>
              ) : null}

              {matches.slice(0, PICKER_LIMIT).map((spell) => (
                <Button
                  key={spell.index}
                  type="button"
                  variant="outline"
                  className="h-11 px-3 text-sm"
                  onClick={() => start(spell)}
                >
                  {spell.name}
                </Button>
              ))}
            </div>

            {candidates.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No spells on this character yet — type what you are concentrating on.
              </p>
            ) : matches.length > PICKER_LIMIT ? (
              <p className="text-muted-foreground text-xs">
                {matches.length - PICKER_LIMIT} more — keep typing to narrow it down.
              </p>
            ) : null}

            <p className="text-muted-foreground text-xs">
              One at a time: starting another concentration spell ends this one.{' '}
              <Link
                href="/rules/spellcasting"
                className="text-foreground underline underline-offset-4"
              >
                The rules
              </Link>
              .
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
