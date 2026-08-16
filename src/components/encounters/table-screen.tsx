'use client'

import { useCallback, useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { formatReferenceIndex } from '@/lib/characters/display'
import type { TableScreenView } from '@/lib/db/encounters'

/**
 * How often the shared screen re-reads the fight. Faster than the sheet's
 * 15 s (D25): this screen is *watched*, and a turn marker that lags the DM's
 * "next!" by ten seconds reads as broken.
 */
const REFRESH_INTERVAL_MS = 5_000

/**
 * The player-facing table screen (D24): big type for a TV across the room,
 * initiative order with the active combatant unmissable, HP for PCs only.
 * Everything it renders came through `GET /api/table/[token]`, which is
 * sanitized at the data layer — there is no monster HP here to accidentally
 * show.
 */
export function TableScreen({ token }: { token: string }) {
  const [view, setView] = useState<TableScreenView | null>(null)
  const [dead, setDead] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/table/${token}`)

      if (response.status === 404) {
        setDead(true)
        setView(null)
        return
      }

      if (!response.ok) return

      const body = (await response.json()) as TableScreenView
      setDead(false)
      setView(body)
    } catch {
      // Keep showing the last good state; the next tick retries.
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      void load()
    }

    const interval = setInterval(tick, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  if (dead) {
    return (
      <main className="mx-auto flex min-h-[60dvh] w-full max-w-5xl items-center justify-center p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">This table screen is no longer live.</h1>
          <p className="text-muted-foreground text-lg">
            Ask the DM for a fresh link — the old one has been retired.
          </p>
        </div>
      </main>
    )
  }

  if (!view) {
    return (
      <main className="mx-auto flex min-h-[60dvh] w-full max-w-5xl items-center justify-center p-6">
        <p className="text-muted-foreground text-xl">
          {loading ? 'Setting the table…' : 'Could not reach the table. Retrying…'}
        </p>
      </main>
    )
  }

  const activeIndex =
    view.combatants.length > 0 ? Math.min(view.activeTurn, view.combatants.length - 1) : -1

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{view.encounterName}</h1>
          <p className="text-muted-foreground text-lg">{view.campaignName}</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums sm:text-3xl">Round {view.round}</p>
      </header>

      {view.combatants.length > 0 ? (
        <ol className="space-y-3" aria-label="Initiative order">
          {view.combatants.map((combatant, index) => {
            const active = index === activeIndex

            return (
              <li
                key={combatant.id}
                aria-current={active ? 'true' : undefined}
                className={`flex items-center gap-4 rounded-lg border p-4 sm:p-5 ${
                  active ? 'border-primary bg-primary/10 ring-primary ring-2' : ''
                }`}
              >
                <span
                  className="w-12 shrink-0 text-center text-2xl font-bold tabular-nums sm:text-3xl"
                  aria-label={
                    combatant.initiative === null
                      ? 'No initiative'
                      : `Initiative ${combatant.initiative}`
                  }
                >
                  {combatant.initiative ?? '—'}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-2xl sm:text-3xl ${
                      active ? 'font-bold' : 'font-medium'
                    }`}
                  >
                    {combatant.label}
                  </span>
                  {combatant.conditions.length > 0 ? (
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {combatant.conditions.map((condition) => (
                        <Badge key={condition} variant="secondary" className="text-sm">
                          {formatReferenceIndex(condition)}
                        </Badge>
                      ))}
                    </span>
                  ) : null}
                </span>

                {combatant.characterHp ? (
                  <span className="shrink-0 text-right">
                    <span className="block text-xl font-semibold tabular-nums sm:text-2xl">
                      <span
                        className={
                          combatant.characterHp.current === 0
                            ? 'text-destructive'
                            : combatant.characterHp.current * 2 <= combatant.characterHp.max
                              ? 'text-amber-600'
                              : undefined
                        }
                      >
                        {combatant.characterHp.current}
                      </span>
                      <span className="text-muted-foreground">/{combatant.characterHp.max}</span>
                      {combatant.characterHp.temp > 0 ? (
                        <span className="ml-1 text-lg font-semibold text-sky-600">
                          +{combatant.characterHp.temp}
                        </span>
                      ) : null}
                    </span>
                    <span className="bg-muted mt-1 block h-2 w-24 overflow-hidden rounded-full sm:w-32">
                      <span
                        className={`block h-full rounded-full ${
                          combatant.characterHp.current === 0
                            ? 'bg-destructive'
                            : combatant.characterHp.current * 2 <= combatant.characterHp.max
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${
                            combatant.characterHp.max > 0
                              ? Math.min(
                                  100,
                                  ((combatant.characterHp.current + combatant.characterHp.temp) /
                                    combatant.characterHp.max) *
                                    100,
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </span>
                  </span>
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-muted-foreground text-xl">The order is empty — the fight is brewing.</p>
      )}
    </main>
  )
}
