'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  CURRENCY_KEYS,
  setCurrency,
  type CombatState,
  type CurrencyKey,
} from '@/lib/characters/combat'
import { formatReferenceIndex } from '@/lib/characters/display'
import { ATTUNEMENT_LIMIT, type ItemPatch } from '@/lib/characters/items'
import type { CharacterItem } from '@/lib/db/schema'
import { useArmor, useWeapons } from '@/lib/dnd-api/swr-hooks'

function displayName(item: CharacterItem): string {
  return (
    item.customName ?? (item.equipmentIndex ? formatReferenceIndex(item.equipmentIndex) : 'Item')
  )
}

async function messageOf(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  return body?.error ?? fallback
}

/** One denomination, committed on blur or Enter rather than per keystroke. */
function CurrencyField({
  coin,
  value,
  onCommit,
}: {
  coin: CurrencyKey
  value: number
  onCommit: (next: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft === null) return
    const parsed = Number.parseInt(draft, 10)
    if (Number.isFinite(parsed) && parsed >= 0) onCommit(parsed)
    setDraft(null)
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={`currency-${coin}`} className="block text-center text-xs uppercase">
        {coin}
      </Label>
      <Input
        id={`currency-${coin}`}
        type="number"
        inputMode="numeric"
        min={0}
        className="h-11 px-1 text-center tabular-nums"
        value={draft ?? String(value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          }
        }}
      />
    </div>
  )
}

/**
 * Inventory, first slice (DND-035): the items a character carries, the
 * equipped/attuned flags that make attacks and AC real, and the five coin
 * columns.
 *
 * Items live in their own table behind `/api/characters/[id]/items`, so their
 * writes do not ride the combat-state pipeline: each mutation is optimistic
 * against the local list, and a refusal — the attunement cap's 409 above all —
 * reverts the row and toasts the server's own words. Currency *is* combat
 * state and goes through `apply()` like every other number on the sheet.
 */
export function InventoryCard({
  characterId,
  items,
  onItemsChange,
  state,
  apply,
}: {
  characterId: string
  items: CharacterItem[]
  onItemsChange: (items: CharacterItem[]) => void
  state: CombatState
  apply: (transition: (state: CombatState) => CombatState) => void
}) {
  const [adding, setAdding] = useState(false)
  const [customName, setCustomName] = useState('')
  const [notesOpenFor, setNotesOpenFor] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CharacterItem | null>(null)

  const { weapons, isLoading: weaponsLoading, error: weaponsError } = useWeapons()
  const { armor, isLoading: armorLoading, error: armorError } = useArmor()

  const attunedCount = items.filter((item) => item.attuned).length

  function fail(message: string) {
    toast.error(message, { id: `items-${characterId}`, duration: 8000 })
  }

  async function addItem(input: { equipmentIndex?: string; customName?: string }) {
    try {
      const response = await fetch(`/api/characters/${characterId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        fail(await messageOf(response, 'Could not add the item.'))
        return
      }

      const body = (await response.json()) as { item: CharacterItem }
      onItemsChange([...items, body.item])
    } catch {
      fail('Could not add the item. Check your connection.')
    }
  }

  async function patchItem(item: CharacterItem, patch: ItemPatch) {
    // Optimistic: the row repaints now, and comes back if the server refuses.
    const previous = items
    onItemsChange(items.map((row) => (row.id === item.id ? { ...row, ...patch } : row)))

    try {
      const response = await fetch(`/api/characters/${characterId}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })

      if (!response.ok) {
        onItemsChange(previous)
        fail(await messageOf(response, 'That change did not save.'))
        return
      }

      const body = (await response.json()) as { item: CharacterItem }
      onItemsChange(previous.map((row) => (row.id === item.id ? body.item : row)))
    } catch {
      onItemsChange(previous)
      fail('That change did not save. Check your connection.')
    }
  }

  async function removeItem(item: CharacterItem) {
    const previous = items
    onItemsChange(items.filter((row) => row.id !== item.id))
    setDeleting(null)

    try {
      const response = await fetch(`/api/characters/${characterId}/items/${item.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        onItemsChange(previous)
        fail(await messageOf(response, 'Could not remove the item.'))
      }
    } catch {
      onItemsChange(previous)
      fail('Could not remove the item. Check your connection.')
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          Inventory
          {attunedCount > 0 ? (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {attunedCount}/{ATTUNEMENT_LIMIT} attuned
            </span>
          ) : null}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          className="h-11 px-3"
          aria-expanded={adding}
          onClick={() => setAdding((open) => !open)}
        >
          {adding ? 'Done' : 'Add items'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && !adding ? (
          <p className="text-muted-foreground text-sm">
            Nothing carried yet. Add a weapon or armour and equip it — attacks and AC follow from
            what is equipped.
          </p>
        ) : null}

        {items.length > 0 ? (
          <ul className="space-y-3" aria-label="Items">
            {items.map((item) => (
              <li key={item.id} className="space-y-2 border-b pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 text-sm font-medium">{displayName(item)}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11"
                      aria-label={`One fewer ${displayName(item)}`}
                      disabled={item.quantity <= 1}
                      onClick={() => patchItem(item, { quantity: item.quantity - 1 })}
                    >
                      −
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11"
                      aria-label={`One more ${displayName(item)}`}
                      onClick={() => patchItem(item, { quantity: item.quantity + 1 })}
                    >
                      +
                    </Button>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={item.equipped ? 'default' : 'outline'}
                    className="h-11 px-3 text-sm"
                    aria-pressed={item.equipped}
                    aria-label={`${displayName(item)} equipped`}
                    onClick={() => patchItem(item, { equipped: !item.equipped })}
                  >
                    Equipped
                  </Button>
                  <Button
                    type="button"
                    variant={item.attuned ? 'default' : 'outline'}
                    className="h-11 px-3 text-sm"
                    aria-pressed={item.attuned}
                    aria-label={`${displayName(item)} attuned`}
                    onClick={() => patchItem(item, { attuned: !item.attuned })}
                  >
                    Attuned
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 px-3 text-sm"
                    aria-expanded={notesOpenFor === item.id}
                    onClick={() => setNotesOpenFor(notesOpenFor === item.id ? null : item.id)}
                  >
                    Notes
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive h-11 px-3 text-sm"
                    aria-label={`Remove ${displayName(item)}`}
                    onClick={() => setDeleting(item)}
                  >
                    Remove
                  </Button>
                </div>

                {notesOpenFor === item.id ? (
                  <Textarea
                    aria-label={`Notes for ${displayName(item)}`}
                    className="min-h-20"
                    defaultValue={item.notes ?? ''}
                    placeholder="Silvered. Needs two hands."
                    onBlur={(event) => {
                      const trimmed = event.target.value.trim()
                      const next = trimmed === '' ? null : trimmed
                      if (next !== item.notes) patchItem(item, { notes: next })
                    }}
                  />
                ) : item.notes ? (
                  <p className="text-muted-foreground text-xs">{item.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {adding ? (
          <Tabs defaultValue="weapons">
            <TabsList className="w-full">
              <TabsTrigger value="weapons">Weapons</TabsTrigger>
              <TabsTrigger value="armour">Armour</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="weapons">
              {weaponsError ? (
                <p className="text-destructive text-sm" role="alert">
                  Could not load the weapon list — try again in a moment.
                </p>
              ) : weaponsLoading ? (
                <p className="text-muted-foreground text-sm">Loading weapons…</p>
              ) : (
                <ul className="max-h-64 overflow-y-auto overscroll-contain rounded-md border p-1">
                  {weapons.map((weapon) => (
                    <li key={weapon.index}>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-11 w-full justify-start px-2 text-sm font-normal"
                        onClick={() => addItem({ equipmentIndex: weapon.index })}
                      >
                        {weapon.name}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="armour">
              {armorError ? (
                <p className="text-destructive text-sm" role="alert">
                  Could not load the armour list — try again in a moment.
                </p>
              ) : armorLoading ? (
                <p className="text-muted-foreground text-sm">Loading armour…</p>
              ) : (
                <ul className="max-h-64 overflow-y-auto overscroll-contain rounded-md border p-1">
                  {armor.map((piece) => (
                    <li key={piece.index}>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-11 w-full justify-start px-2 text-sm font-normal"
                        onClick={() => addItem({ equipmentIndex: piece.index })}
                      >
                        {piece.name}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="custom">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="custom-item-name" className="text-xs">
                    Item name
                  </Label>
                  <Input
                    id="custom-item-name"
                    className="h-11"
                    placeholder="Bag of interesting rocks"
                    value={customName}
                    onChange={(event) => setCustomName(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  className="h-11"
                  disabled={!customName.trim()}
                  onClick={() => {
                    void addItem({ customName: customName.trim() })
                    setCustomName('')
                  }}
                >
                  Add item
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}

        <div className="border-t pt-3">
          <p className="mb-2 text-sm font-medium">Currency</p>
          <div className="grid grid-cols-5 gap-2">
            {CURRENCY_KEYS.map((coin) => (
              <CurrencyField
                key={coin}
                coin={coin}
                value={state[coin]}
                onCommit={(next) => apply((current) => setCurrency(current, coin, next))}
              />
            ))}
          </div>
        </div>

        <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Remove {deleting ? displayName(deleting) : 'this item'}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                It comes off the inventory, notes and all. There is no undo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-11">Keep it</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 h-11 text-white"
                onClick={() => deleting && void removeItem(deleting)}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
