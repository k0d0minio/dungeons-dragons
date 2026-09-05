'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { CharacterReadiness } from '@/lib/characters/readiness'
import type { CharacterItem, SpellSlotState } from '@/lib/db/schema'
import { WEAPONS } from '@/lib/srd/weapons'

/** "the longsword and the javelin" — the kit's weapons as the DM says them. */
function spoken(indexes: readonly string[]): string {
  const names = indexes.map((index) => (WEAPONS.get(index)?.name ?? index).toLowerCase())
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

type Fix = 'weapon' | 'spellSlots' | 'masteries'

/**
 * The checklist for the tutorial night (`first-table/dm-character-profile`):
 * each line a fact about the character as it is stored, and where the fact is
 * wrong, one tap that calls the same three rules the wizard calls on creation
 * (`src/lib/characters/readiness.ts`) — so the DM's fix and the wizard's
 * default cannot disagree. Jamie chose this over a self-healing sheet: the
 * seven characters made before the rules existed are fixed by the DM's hand,
 * one line at a time, nothing automatic.
 *
 * Each fix is a PATCH through the character's existing routes. A weapon is
 * readied on its item rows (no version to guard); slots and masteries go
 * through `PATCH /api/characters/[id]` with the version the page rendered,
 * and a 409 — a player's phone wrote first — refreshes the page and says so
 * rather than retrying blindly. The page re-renders after every fix, so the
 * next line reads the row as it is now.
 */
export function ReadinessCard({
  character,
  items,
  readiness,
  masteryShown,
}: {
  character: { id: string; version: number }
  items: CharacterItem[]
  readiness: CharacterReadiness
  /** Whether this table's Weapon mastery gate is on — the choice exists either way. */
  masteryShown: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<Fix | null>(null)
  // The refresh is what brings the next version down: the row PATCH bumps it,
  // and a second fix sent with the version this page rendered would be
  // refused with a 409 that reads as somebody else's write. So the buttons
  // stay disabled until the refreshed props have arrived, not merely until
  // the response did.
  const [refreshing, startRefresh] = useTransition()

  async function patchRow(body: Record<string, unknown>): Promise<boolean> {
    const response = await fetch(`/api/characters/${character.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, version: character.version }),
    })

    if (response.status === 409) {
      toast.warning('Someone changed this character first. The page has refreshed — try again.')
      return false
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      toast.error(payload?.error ?? 'That did not save. Try again.')
      return false
    }
    return true
  }

  async function run(fix: Fix, work: () => Promise<boolean>, done: string) {
    if (busy) return
    setBusy(fix)

    try {
      if (await work()) toast.success(done)
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setBusy(null)
      // The server is the only thing that knows what the row says now.
      startRefresh(() => router.refresh())
    }
  }

  async function readyWeapons(): Promise<boolean> {
    // One row per weapon, the same rule the wizard applies: a pack can hold the
    // same index twice (a bard's class daggers beside a criminal's), and the
    // sheet prints an attack line per readied row. `delete` answers true once
    // per index, so the first row that carries a pick is the one readied.
    const wanted = new Set(readiness.weapon.fix)
    const rows = items.filter(
      (item) =>
        !item.equipped && item.equipmentIndex !== null && wanted.delete(item.equipmentIndex),
    )

    // Items first, one row at a time: each is its own statement, and a
    // character with one weapon readied is a better partial state than none.
    for (const item of rows) {
      const response = await fetch(`/api/characters/${character.id}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipped: true }),
      })
      if (!response.ok) {
        toast.error('That weapon did not ready. Try again.')
        return false
      }
    }
    return true
  }

  const equippedWeapons = items
    .filter((item) => item.equipped && item.equipmentIndex !== null)
    .map((item) => item.equipmentIndex as string)
    .filter((index) => WEAPONS.has(index))

  const lines: Array<{
    key: Fix | 'skills'
    ready: boolean
    applies: boolean
    text: string
    action?: { label: string; onClick: () => void } | { label: string; href: string }
  }> = [
    {
      key: 'weapon',
      applies: readiness.weapon.applies,
      ready: readiness.weapon.ready,
      text: readiness.weapon.ready
        ? `Weapon readied: ${spoken(equippedWeapons)}`
        : readiness.weapon.fix.length > 0
          ? `No weapon readied — ${spoken(readiness.weapon.fix)} in the pack`
          : 'No weapon carried',
      action:
        !readiness.weapon.ready && readiness.weapon.fix.length > 0
          ? {
              label: `Ready the ${spoken(readiness.weapon.fix)}`,
              onClick: () =>
                run(
                  'weapon',
                  readyWeapons,
                  // The sheet polls its combat state, not its item rows, so an
                  // open sheet shows the readied weapon on its next load.
                  `Readied the ${spoken(readiness.weapon.fix)}. Their sheet shows the attack the next time it opens.`,
                ),
            }
          : undefined,
    },
    {
      key: 'spellSlots',
      applies: readiness.spellSlots.applies,
      ready: readiness.spellSlots.ready,
      text: readiness.spellSlots.ready
        ? 'Spell slots set up'
        : 'No spell slots — levelled spells cannot be cast',
      action: !readiness.spellSlots.ready
        ? {
            label: 'Give them the standard table',
            onClick: () =>
              run(
                'spellSlots',
                () => patchRow({ spellSlots: readiness.spellSlots.fix satisfies SpellSlotState }),
                'Slots set. Their Spells segment shows them within a few seconds.',
              ),
          }
        : undefined,
    },
    {
      key: 'masteries',
      applies: readiness.masteries.applies,
      ready: readiness.masteries.ready,
      text: readiness.masteries.ready
        ? `Weapon masteries chosen${masteryShown ? '' : ' (hidden while the Weapon mastery feature is off)'}`
        : `No weapon masteries chosen${masteryShown ? '' : ' — hidden from the player while the feature is off, but the choice should exist before it opens'}`,
      action:
        !readiness.masteries.ready && readiness.masteries.fix
          ? {
              label: `Pick ${spoken(readiness.masteries.fix)} from the kit`,
              onClick: () =>
                run(
                  'masteries',
                  () => patchRow({ masteredWeaponIndexes: readiness.masteries.fix }),
                  'Masteries chosen from the kit.',
                ),
            }
          : undefined,
    },
    {
      key: 'skills',
      applies: readiness.skills.applies,
      ready: readiness.skills.ready,
      text: readiness.skills.ready ? 'Skills chosen' : 'No skills chosen',
      action: !readiness.skills.ready
        ? { label: 'Choose them on Edit', href: `/characters/${character.id}/edit` }
        : undefined,
    },
  ]

  const shown = lines.filter((line) => line.applies)
  const outstanding = shown.filter((line) => !line.ready).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ready for the night</CardTitle>
        <CardDescription>
          {outstanding === 0
            ? 'Everything the first fight needs is on the sheet.'
            : `${outstanding} thing${outstanding === 1 ? '' : 's'} to fix. Each tap writes the same defaults the wizard gives a new character.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3" aria-label="Readiness">
          {shown.map((line) => (
            <li key={line.key} className="flex flex-col gap-2">
              <span className="flex items-start gap-2 text-sm">
                <span
                  aria-hidden
                  className={`mt-0.5 inline-block size-4 shrink-0 rounded-full ${
                    line.ready ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="sr-only">{line.ready ? 'Ready:' : 'Not ready:'}</span>
                <span>{line.text}</span>
              </span>
              {line.action ? (
                'href' in line.action ? (
                  <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
                    <Link href={line.action.href}>{line.action.label}</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full sm:w-auto"
                    disabled={busy !== null || refreshing}
                    onClick={line.action.onClick}
                  >
                    {busy === line.key ? 'Saving…' : line.action.label}
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
