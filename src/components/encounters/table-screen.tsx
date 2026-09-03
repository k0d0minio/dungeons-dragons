'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { formatReferenceIndex } from '@/lib/characters/display'
import type { TableReveal, TableScreenView } from '@/lib/db/encounters'

/**
 * How often the shared screen re-reads the fight. Faster than the sheet's
 * 15 s (D25): this screen is *watched*, and a turn marker that lags the DM's
 * "next!" by ten seconds reads as broken.
 */
const REFRESH_INTERVAL_MS = 5_000

/** What each kind of reveal is called on a screen the whole room reads. */
const REVEAL_KIND_LABEL: Record<TableReveal['kind'], string> = {
  npc: 'A new face',
  location: 'A new place',
  handout: 'Passed across the table',
}

/**
 * The newest reveal, featured (`dm-run-suite/reveal-controls`).
 *
 * The moment the ticket is actually about: the DM taps reveal, and within a
 * poll the thing they revealed is on the wall in type readable from across the
 * room. It carries what the data layer sent and nothing more — a name, and a
 * one-line summary where the DM wrote one. There is no description here and no
 * picture: the token that opens this screen buys the narrowest projection in
 * the app, and the party's own phones hold the rest behind a session.
 *
 * **It sits beside the order, not above it.** A card stacked on top would push
 * the sixth player off a 1080p screen exactly when the table is fullest, so on
 * a wide screen this is the right-hand column and initiative keeps the left.
 * Narrow screens stack it first, where the news belongs.
 */
function RevealCard({ reveal }: { reveal: TableReveal }) {
  return (
    <aside
      aria-label="Just revealed"
      aria-live="polite"
      className="border-primary bg-primary/10 h-fit rounded-lg border-2 p-5 lg:col-start-2 lg:row-start-1"
    >
      <p className="text-primary text-sm font-bold tracking-widest uppercase sm:text-base">
        Just revealed
      </p>
      <p className="mt-2 text-3xl font-bold break-words sm:text-4xl">{reveal.name}</p>
      <p className="text-muted-foreground mt-1 text-lg">{REVEAL_KIND_LABEL[reveal.kind]}</p>

      {reveal.summary ? <p className="mt-3 text-xl sm:text-2xl">{reveal.summary}</p> : null}

      {/* Only for handouts, and phrased as an instruction rather than a promise
          about content: the screen was not told whether there is a picture. */}
      {reveal.kind === 'handout' ? (
        <p className="text-muted-foreground mt-3 text-lg">Look at your phones.</p>
      ) : null}
    </aside>
  )
}

/**
 * The player-facing table screen (D24): big type for a TV across the room,
 * initiative order with the active combatant unmissable, HP for PCs only, and
 * the DM's newest reveal beside it (`dm-run-suite/reveal-controls`).
 * Everything it renders came through `GET /api/table/[token]`, which is
 * sanitized at the data layer — there is no monster HP here to accidentally
 * show, and no DM-only prep either.
 *
 * **It runs chromeless** — no site header, no tab bar, no legal footer; see
 * `hidesChrome` in `navigation/app-shell.tsx`. The screen owns the whole
 * viewport, so the layout here is a sticky title bar over a page that scrolls.
 *
 * **Scroll-to-active over fit-to-screen** (`table-screen-legibility`). The
 * register's open question — TV across the room, or a tablet propped
 * mid-table? — is still Jamie's, and the two answers want different fixes:
 * a TV wants ten rows squeezed into one screenful, a propped device wants the
 * order kept readable and the turn brought to the reader. This ships the
 * second, because it is the one that survives being wrong: a tablet showing
 * the turn is right, and a TV showing the turn is at worst missing three rows
 * that were never the ones anyone was looking at. If the answer comes back
 * "TV", the density variant is a follow-up, not a rewrite.
 */
export function TableScreen({ token }: { token: string }) {
  const [view, setView] = useState<TableScreenView | null>(null)
  const [dead, setDead] = useState(false)
  const [loading, setLoading] = useState(true)
  const activeRowRef = useRef<HTMLLIElement | null>(null)

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
    // The first load is deferred a tick: the effect body itself must not set
    // state, even transitively (react-hooks/set-state-in-effect), and one
    // task's delay is invisible next to the fetch it kicks off.
    const initial = setTimeout(() => void load(), 0)

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      void load()
    }

    const interval = setInterval(tick, REFRESH_INTERVAL_MS)
    return () => {
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [load])

  // Both derived above the early returns, because the effect below them
  // cannot be: hooks run unconditionally, and `view` is null for the first
  // poll. An empty order is index -1, which matches no row.
  const activeIndex =
    view && view.combatants.length > 0 ? Math.min(view.activeTurn, view.combatants.length - 1) : -1
  const activeCombatantId = activeIndex < 0 ? null : (view?.combatants[activeIndex]?.id ?? null)

  useEffect(() => {
    const row = activeRowRef.current

    // No order yet, or a jsdom-shaped element without the method — either way
    // there is nothing to scroll and nothing to fail on.
    if (!row || typeof row.scrollIntoView !== 'function') return

    // Nobody is holding this device: when the DM says "next!", the turn has to
    // come to the room rather than wait for someone to reach over and swipe.
    // Centred, so the rows either side stay visible — the player after you
    // knowing they are next is half of what the screen is for.
    row.scrollIntoView({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    })
    // Keyed on who is up rather than only where they are, so a re-sorted order
    // that leaves the index alone still moves the screen.
  }, [activeCombatantId, activeIndex])

  if (dead) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-5xl items-center justify-center p-6">
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
      <main className="mx-auto flex min-h-dvh w-full max-w-5xl items-center justify-center p-6">
        <p className="text-muted-foreground text-xl">
          {loading ? 'Setting the table…' : 'Could not reach the table. Retrying…'}
        </p>
      </main>
    )
  }

  return (
    // Full-bleed: the shell's chrome is off on this route, so the screen is the
    // whole viewport. The cap is wide enough that a 1080p TV fills it and only
    // an ultrawide sees a margin.
    <main className="mx-auto flex min-h-dvh w-full max-w-[110rem] flex-col">
      {/* Sticky, because the order now scrolls under it: the round number is
          the one thing that must not leave the screen when it does. */}
      <header className="bg-background sticky top-0 z-10 flex flex-wrap items-baseline justify-between gap-3 border-b px-6 py-4 sm:px-8">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{view.encounterName}</h1>
          <p className="text-muted-foreground text-lg">{view.campaignName}</p>
        </div>
        <p className="text-3xl font-semibold tabular-nums sm:text-4xl">Round {view.round}</p>
      </header>

      {/* Two columns only when there is something to put in the second one, so
          a screen with no recent reveal is exactly the screen it was before. */}
      <div
        className={`flex-1 px-6 py-6 sm:px-8 ${
          view.reveal ? 'grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''
        }`}
      >
        {view.reveal ? <RevealCard reveal={view.reveal} /> : null}

        <div className="lg:col-start-1 lg:row-start-1">
          {view.combatants.length > 0 ? (
            <ol className="space-y-3" aria-label="Initiative order">
              {view.combatants.map((combatant, index) => {
                const active = index === activeIndex

                return (
                  <li
                    key={combatant.id}
                    ref={active ? activeRowRef : null}
                    aria-current={active ? 'true' : undefined}
                    // A 2px ring was a hairline from six feet away; at ring-4
                    // the lit row is the first thing the eye lands on.
                    className={`flex items-center gap-5 rounded-lg border p-4 sm:p-5 ${
                      active ? 'border-primary bg-primary/15 ring-primary ring-4' : ''
                    }`}
                  >
                    <span
                      className="w-16 shrink-0 text-center text-3xl font-bold tabular-nums sm:text-4xl"
                      aria-label={
                        combatant.initiative === null
                          ? 'No initiative'
                          : `Initiative ${combatant.initiative}`
                      }
                    >
                      {combatant.initiative ?? '—'}
                    </span>

                    <span className="min-w-0 flex-1">
                      {/* Semibold even when idle: `font-medium` at this size
                          is a weight you read on a phone in your hand, not one
                          that survives the width of a table. */}
                      <span
                        className={`block truncate text-3xl sm:text-4xl ${
                          active ? 'font-bold' : 'font-semibold'
                        }`}
                      >
                        {combatant.label}
                      </span>
                      {combatant.conditions.length > 0 ? (
                        <span className="mt-2 flex flex-wrap gap-2">
                          {combatant.conditions.map((condition) => (
                            // Conditions were `text-sm` — the smallest type on
                            // the screen carrying the state most likely to
                            // change what a player does on their turn. Sized
                            // up to a shade under the HP, and given a real
                            // border so the chip has an edge at distance
                            // rather than a faint tint against the row.
                            <Badge
                              key={condition}
                              variant="secondary"
                              className="border-secondary-foreground/25 px-3 py-1 text-lg font-semibold sm:text-xl"
                            >
                              {formatReferenceIndex(condition)}
                            </Badge>
                          ))}
                        </span>
                      ) : null}
                    </span>

                    {combatant.characterHp ? (
                      <span className="shrink-0 text-right">
                        <span className="block text-2xl font-semibold tabular-nums sm:text-3xl">
                          <span
                            className={
                              combatant.characterHp.current === 0
                                ? 'text-destructive'
                                : combatant.characterHp.current * 2 <= combatant.characterHp.max
                                  ? 'text-hp-bloodied'
                                  : undefined
                            }
                          >
                            {combatant.characterHp.current}
                          </span>
                          <span className="text-muted-foreground">
                            /{combatant.characterHp.max}
                          </span>
                          {combatant.characterHp.temp > 0 ? (
                            <span className="ml-1 text-xl font-semibold text-hp-temp">
                              +{combatant.characterHp.temp}
                            </span>
                          ) : null}
                        </span>
                        <span className="bg-muted mt-1.5 block h-3 w-28 overflow-hidden rounded-full sm:w-40">
                          <span
                            className={`block h-full rounded-full ${
                              combatant.characterHp.current === 0
                                ? 'bg-destructive'
                                : combatant.characterHp.current * 2 <= combatant.characterHp.max
                                  ? 'bg-hp-bloodied'
                                  : 'bg-hp-healthy'
                            }`}
                            style={{
                              width: `${
                                combatant.characterHp.max > 0
                                  ? Math.min(
                                      100,
                                      ((combatant.characterHp.current +
                                        combatant.characterHp.temp) /
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
            <p className="text-muted-foreground text-xl">
              The order is empty — the fight is brewing.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
