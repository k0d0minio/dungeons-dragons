'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AddCombatantsSheet, type RosterOption } from '@/components/encounters/add-combatants-sheet'
import { CombatantRow } from '@/components/encounters/combatant-row'
import {
  ReferenceDetailSheet,
  type ReferenceSelection,
} from '@/components/reference/reference-detail-sheet'
import { Button } from '@/components/ui/button'
import type { Character } from '@/lib/db/characters'
import type {
  CombatantPatch,
  CombatantWithCharacter,
  Encounter,
  EncounterCombatant,
} from '@/lib/db/encounters'
import type { Concentration } from '@/lib/db/schema'
import { advanceTurn, compareByInitiative } from '@/lib/encounters/tracker'

/** How often an open tracker re-reads the encounter and the party (D25). */
const REFRESH_INTERVAL_MS = 15_000

/**
 * The DM's minute-to-minute screen (DND-031): initiative order, the round
 * stepper, per-instance monster HP, and the party's live state.
 *
 * Two write paths, deliberately (D13/D17): monster rows PATCH their own
 * combatant row — last write wins, and only one DM is writing. PC rows write
 * *through the character API* with the version guard, exactly as the sheet
 * does, so the DM's damage tap and the player's own tap reconcile via 409
 * instead of silently clobbering each other. On a 409 the tracker adopts the
 * server's row and says so — the same contract as `use-combat-state`.
 *
 * Between taps the tracker re-reads the whole encounter every ~15 s (D25),
 * standing down while a write is in flight so the poll can never overwrite an
 * optimistic tap.
 */
export function EncounterTracker({
  initialEncounter,
  initialCombatants,
  roster,
}: {
  initialEncounter: Encounter
  initialCombatants: CombatantWithCharacter[]
  roster: RosterOption[]
}) {
  const [encounter, setEncounter] = useState(initialEncounter)
  const [rows, setRows] = useState(initialCombatants)
  const [adding, setAdding] = useState(false)
  const [selection, setSelection] = useState<ReferenceSelection | null>(null)

  /** Writes in flight — while non-zero the poll keeps its hands off. */
  const pending = useRef(0)

  const encounterId = encounter.id

  const ordered = [...rows].sort((a, b) => compareByInitiative(a.combatant, b.combatant))
  const activeIndex = ordered.length > 0 ? Math.min(encounter.activeTurn, ordered.length - 1) : -1

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/encounters/${encounterId}`)
      if (!response.ok) return

      const body = (await response.json()) as {
        encounter: Encounter
        combatants: CombatantWithCharacter[]
      }

      if (pending.current === 0) {
        setEncounter(body.encounter)
        setRows(body.combatants)
      }
    } catch {
      // A failed poll is silent — the next tap's write path owns the telling.
    }
  }, [encounterId])

  useEffect(() => {
    const tick = () => {
      if (pending.current > 0) return
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      void refresh()
    }

    const interval = setInterval(tick, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  async function send(work: () => Promise<void>) {
    pending.current += 1
    try {
      await work()
    } finally {
      pending.current -= 1
    }
  }

  function nextTurn() {
    const next = advanceTurn(
      { round: encounter.round, activeTurn: encounter.activeTurn },
      ordered.length,
    )

    setEncounter((current) => ({ ...current, ...next }))

    void send(async () => {
      try {
        const response = await fetch(`/api/encounters/${encounterId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        })

        if (!response.ok) {
          toast.error('Could not advance the turn. Check your connection.')
          return
        }

        const body = (await response.json()) as { encounter: Encounter }
        setEncounter(body.encounter)
      } catch {
        toast.error('Could not advance the turn. Check your connection.')
      }
    })
  }

  function patchCombatant(combatantId: string, patch: CombatantPatch) {
    // Optimistic: the tap paints now, the request follows.
    setRows((current) =>
      current.map((row) =>
        row.combatant.id === combatantId
          ? { ...row, combatant: { ...row.combatant, ...patch } as EncounterCombatant }
          : row,
      ),
    )

    void send(async () => {
      try {
        const response = await fetch(`/api/encounters/${encounterId}/combatants/${combatantId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })

        if (!response.ok) {
          toast.error('That change did not save. The tracker will refresh.')
          void refresh()
          return
        }

        const body = (await response.json()) as { combatant: EncounterCombatant }
        setRows((current) =>
          current.map((row) =>
            row.combatant.id === combatantId ? { ...row, combatant: body.combatant } : row,
          ),
        )
      } catch {
        toast.error('That change did not save. Check your connection.')
        void refresh()
      }
    })
  }

  /** Fold a server-confirmed character row into whichever combatant holds it. */
  function adoptCharacter(updated: Character) {
    setRows((current) =>
      current.map((row) =>
        row.combatant.characterId === updated.id ? { ...row, character: updated } : row,
      ),
    )
  }

  function patchCharacter(
    row: CombatantWithCharacter,
    changes: {
      currentHitPoints?: number
      temporaryHitPoints?: number
      conditions?: string[]
      concentration?: Concentration | null
    },
  ) {
    const character = row.character
    if (!character) return

    // Optimistic paint; the version the write carries is the one just read.
    adoptCharacter({ ...character, ...changes })

    void send(async () => {
      try {
        const response = await fetch(`/api/characters/${character.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...changes, version: character.version }),
        })

        if (response.status === 409) {
          // The player (or another device) wrote first — their write is the
          // truth now. Adopt it and say so (DND-028).
          const body = (await response.json()) as { character: Character }
          adoptCharacter(body.character)
          toast.warning(
            `Someone else updated ${character.name} first — the tracker has refreshed. Check your last change.`,
            { id: `tracker-save-${character.id}`, duration: 10_000 },
          )
          return
        }

        if (!response.ok) {
          adoptCharacter(character)
          toast.error('That change did not save. The tracker is showing the last saved values.', {
            id: `tracker-save-${character.id}`,
            duration: 10_000,
          })
          return
        }

        const body = (await response.json()) as { character: Character }
        adoptCharacter(body.character)
      } catch {
        adoptCharacter(character)
        toast.error('That change did not save. Check your connection.', {
          id: `tracker-save-${character.id}`,
          duration: 10_000,
        })
      }
    })
  }

  function removeCombatant(combatantId: string) {
    setRows((current) => current.filter((row) => row.combatant.id !== combatantId))

    void send(async () => {
      try {
        const response = await fetch(`/api/encounters/${encounterId}/combatants/${combatantId}`, {
          method: 'DELETE',
        })

        if (!response.ok && response.status !== 404) {
          toast.error('Could not remove that combatant. The tracker will refresh.')
          void refresh()
        }
      } catch {
        toast.error('Could not remove that combatant. Check your connection.')
        void refresh()
      }
    })
  }

  const handlers = {
    onPatchCombatant: patchCombatant,
    onPatchCharacter: patchCharacter,
    onRemove: removeCombatant,
    onOpenMonster: (monsterIndex: string, label: string) =>
      setSelection({ type: 'monster', index: monsterIndex, name: label }),
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Round{' '}
          <span className="text-foreground text-lg font-bold tabular-nums">{encounter.round}</span>
        </p>
        <Button
          type="button"
          className="h-12 px-5"
          disabled={ordered.length === 0}
          onClick={nextTurn}
        >
          Next turn
        </Button>
      </div>

      {ordered.length > 0 ? (
        <ol className="space-y-2" aria-label="Initiative order">
          {ordered.map((row, index) => (
            <CombatantRow
              key={row.combatant.id}
              row={row}
              active={index === activeIndex}
              handlers={handlers}
            />
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground text-sm">
          Nobody in the fight yet. Add the party and some monsters.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        onClick={() => setAdding(true)}
      >
        Add combatants
      </Button>

      <AddCombatantsSheet
        open={adding}
        onOpenChange={setAdding}
        encounterId={encounterId}
        roster={roster}
        inEncounterCharacterIds={rows
          .map((row) => row.combatant.characterId)
          .filter((id): id is string => id !== null)}
        onAdded={() => void refresh()}
      />

      <ReferenceDetailSheet selection={selection} onClose={() => setSelection(null)} />
    </div>
  )
}
