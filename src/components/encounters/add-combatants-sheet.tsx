'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { searchMonsters, useMonster, useMonsters } from '@/lib/dnd-api/swr-hooks'

/** A roster character as the Party tab offers it. */
export interface RosterOption {
  id: string
  name: string
}

/** Enough rows to find any monster by typing; the list has 300+. */
const MONSTER_RESULT_LIMIT = 30

/**
 * The "Add combatants" bottom sheet (DND-031): a Party tab that adds roster
 * characters one tap at a time (or all at once), and a Monsters tab that
 * searches the reference list, takes a count, and seeds each instance's HP
 * from the monster's average — editable before adding, because "the big one
 * has more" is a DM habit worth one input field.
 */
export function AddCombatantsSheet({
  open,
  onOpenChange,
  encounterId,
  roster,
  inEncounterCharacterIds,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  encounterId: string
  roster: RosterOption[]
  inEncounterCharacterIds: string[]
  onAdded: () => void
}) {
  const [busy, setBusy] = useState(false)

  const inEncounter = new Set(inEncounterCharacterIds)
  const addable = roster.filter((character) => !inEncounter.has(character.id))

  async function post(body: unknown, failure: string): Promise<boolean> {
    if (busy) return false
    setBusy(true)

    try {
      const response = await fetch(`/api/encounters/${encounterId}/combatants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        toast.error(failure)
        return false
      }

      onAdded()
      return true
    } catch {
      toast.error('That did not send. Check your connection.')
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85dvh] gap-0 rounded-t-xl p-0 sm:mx-auto sm:max-w-2xl [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:top-3 [&>button]:right-3"
      >
        <SheetHeader className="border-b pr-14">
          <SheetTitle className="text-lg">Add combatants</SheetTitle>
          <SheetDescription>
            The party from the roster, or monsters from the books.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-10">
          <Tabs defaultValue="party">
            <TabsList className="grid h-11 w-full grid-cols-2">
              <TabsTrigger value="party">Party</TabsTrigger>
              <TabsTrigger value="monsters">Monsters</TabsTrigger>
            </TabsList>

            <TabsContent value="party" className="space-y-3 pt-3">
              {addable.length > 0 ? (
                <>
                  <Button
                    type="button"
                    className="h-11 w-full"
                    disabled={busy}
                    onClick={() =>
                      void post(
                        { characterIds: addable.map((character) => character.id) },
                        'Could not add the party. Try again.',
                      )
                    }
                  >
                    Add all ({addable.length})
                  </Button>
                  <ul className="space-y-2">
                    {addable.map((character) => (
                      <li key={character.id}>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 w-full justify-between"
                          disabled={busy}
                          onClick={() =>
                            void post(
                              { characterIds: [character.id] },
                              `Could not add ${character.name}. Try again.`,
                            )
                          }
                        >
                          <span className="truncate">{character.name}</span>
                          <span aria-hidden>+</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {roster.length > 0
                    ? 'The whole party is already in.'
                    : 'Nobody has joined this campaign yet.'}
                </p>
              )}
            </TabsContent>

            <TabsContent value="monsters" className="pt-3">
              <MonstersTab busy={busy} post={post} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MonstersTab({
  busy,
  post,
}: {
  busy: boolean
  post: (body: unknown, failure: string) => Promise<boolean>
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<{ index: string; name: string } | null>(null)
  const [count, setCount] = useState(1)
  const [hitPoints, setHitPoints] = useState('')

  const { monsters, isLoading } = useMonsters()
  // The detail fetch is what knows the average HP; it only fires on selection.
  const { monster } = useMonster(selected?.index ?? null)

  const results = searchMonsters(monsters, query).slice(0, MONSTER_RESULT_LIMIT)

  // The monster's average HP from the reference data, unless the DM typed
  // their own number for this batch.
  const parsedHp = Number.parseInt(hitPoints, 10)
  const effectiveHp =
    Number.isFinite(parsedHp) && parsedHp > 0 ? parsedHp : (monster?.hit_points ?? null)

  if (selected) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          className="h-11 px-2"
          onClick={() => {
            setSelected(null)
            setHitPoints('')
            setCount(1)
          }}
        >
          ← Back to search
        </Button>

        <p className="font-medium">{selected.name}</p>

        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="monster-count">How many</Label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label="One fewer"
                disabled={count <= 1}
                onClick={() => setCount((current) => Math.max(1, current - 1))}
              >
                −
              </Button>
              <span
                id="monster-count"
                className="w-8 text-center text-lg font-semibold tabular-nums"
              >
                {count}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label="One more"
                disabled={count >= 20}
                onClick={() => setCount((current) => Math.min(20, current + 1))}
              >
                +
              </Button>
            </div>
          </div>
          <div className="w-28 space-y-1.5">
            <Label htmlFor="monster-hp">HP each</Label>
            <Input
              id="monster-hp"
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              className="h-11 tabular-nums"
              placeholder={monster?.hit_points !== undefined ? String(monster.hit_points) : '—'}
              value={hitPoints}
              onChange={(event) => setHitPoints(event.target.value)}
            />
          </div>
        </div>

        <Button
          type="button"
          className="h-11 w-full"
          disabled={busy}
          onClick={() =>
            void post(
              {
                monsterIndex: selected.index,
                name: selected.name,
                count,
                maxHitPoints: effectiveHp,
              },
              `Could not add ${selected.name}. Try again.`,
            ).then((added) => {
              if (added) {
                setSelected(null)
                setHitPoints('')
                setCount(1)
              }
            })
          }
        >
          Add {count} × {selected.name}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="monster-search">Search monsters</Label>
        <Input
          id="monster-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. goblin"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading the monster list…</p>
      ) : results.length > 0 ? (
        <ul className="space-y-2">
          {results.map((row) => (
            <li key={row.index}>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-between"
                onClick={() => setSelected({ index: row.index, name: row.name })}
              >
                <span className="truncate">{row.name}</span>
                <span aria-hidden className="text-muted-foreground">
                  →
                </span>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Nothing matches.</p>
      )}
    </div>
  )
}
