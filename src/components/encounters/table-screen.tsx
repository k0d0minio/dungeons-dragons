'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { formatReferenceIndex } from '@/lib/characters/display'
import type { TableCombatant, TableReveal } from '@/lib/db/encounters'
import type { TableView } from '@/lib/db/table'

import { TableSpotlight } from './table-spotlight'

/**
 * How often the shared screen re-reads the table. Faster than the sheet's
 * 15 s (D25): this screen is *watched*, and a turn marker — or a letter the DM
 * just cast — that lags the DM's tap by ten seconds reads as broken.
 */
const REFRESH_INTERVAL_MS = 5_000

/** What each kind of reveal is called on a screen the whole room reads. */
const REVEAL_KIND_LABEL: Record<TableReveal['kind'], string> = {
  npc: 'A new face',
  location: 'A new place',
  handout: 'Passed across the table',
}

// The type ladder, in pixels, for the one font size everything else is `em`
// off (`dm-run-suite/table-screen-cast`). The old screen was sized for a
// propped tablet; this one is usually a laptop at the end of a table with five
// people reading it from the far side, so the default is well above the 16 px
// the rest of the app builds on and the control goes further in both
// directions — the same screen has to serve a lit room, a dim one, and
// whatever laptop was to hand.
const TEXT_SIZES = [16, 20, 24, 28, 34] as const
const DEFAULT_SIZE_INDEX = 1
const SIZE_STORAGE_KEY = 'table-screen-text-size'

/**
 * The size control, and where the choice is kept.
 *
 * `localStorage` because the choice belongs to the *screen*, not the campaign:
 * the laptop at the table and the DM's phone previewing the same link want
 * different answers, and neither is a fact about the game worth a column. Every
 * access is wrapped — a browser with site data blocked throws on read, and a
 * table screen must not be a blank page because of it.
 */
function useTextSize(): [number, (next: number) => void] {
  const [index, setIndex] = useState(DEFAULT_SIZE_INDEX)

  useEffect(() => {
    // Deferred a tick, like the first poll below it: the effect body itself
    // must not set state, even transitively (react-hooks/set-state-in-effect).
    const read = setTimeout(() => {
      try {
        const stored = Number(window.localStorage.getItem(SIZE_STORAGE_KEY))
        if (Number.isInteger(stored) && stored >= 0 && stored < TEXT_SIZES.length) setIndex(stored)
      } catch {
        // No stored preference, and no way to keep one. The default is fine.
      }
    }, 0)

    return () => clearTimeout(read)
  }, [])

  const choose = useCallback((next: number) => {
    const clamped = Math.min(TEXT_SIZES.length - 1, Math.max(0, next))
    setIndex(clamped)
    try {
      window.localStorage.setItem(SIZE_STORAGE_KEY, String(clamped))
    } catch {
      // The size still applies for this sitting; it just will not be remembered.
    }
  }, [])

  return [index, choose]
}

/**
 * The newest reveal, featured (`dm-run-suite/reveal-controls`).
 *
 * It carries what the data layer sent and nothing more — a name, and a
 * one-line summary where the DM wrote one. There is no description here and no
 * picture: this is the *notification*, and the thing itself is one tap away on
 * the DM's remote, which puts it on the stage in full.
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
      className="border-primary bg-primary/10 h-fit rounded-lg border-2 p-[1em] lg:col-start-2 lg:row-start-1"
    >
      <p className="text-primary text-[0.8em] font-bold tracking-widest uppercase">Just revealed</p>
      <p className="mt-[0.3em] text-[1.9em] leading-tight font-bold break-words">{reveal.name}</p>
      <p className="text-muted-foreground mt-[0.1em] text-[1em]">
        {REVEAL_KIND_LABEL[reveal.kind]}
      </p>

      {reveal.summary ? <p className="mt-[0.5em] text-[1.2em]">{reveal.summary}</p> : null}

      {/* Only for handouts, and phrased as an instruction rather than a promise
          about content: the screen was not told whether there is a picture. */}
      {reveal.kind === 'handout' ? (
        <p className="text-muted-foreground mt-[0.5em] text-[1em]">Look at your phones.</p>
      ) : null}
    </aside>
  )
}

/** One row of the initiative order, sized off the screen's own font size. */
function CombatantRow({
  combatant,
  active,
  rowRef,
}: {
  combatant: TableCombatant
  active: boolean
  rowRef: React.Ref<HTMLLIElement> | null
}) {
  const hp = combatant.characterHp

  return (
    <li
      ref={rowRef}
      aria-current={active ? 'true' : undefined}
      // A 2px ring was a hairline from six feet away; at ring-4 the lit row is
      // the first thing the eye lands on.
      className={`flex items-center gap-[0.8em] rounded-lg border p-[0.6em] ${
        active ? 'border-primary bg-primary/15 ring-primary ring-4' : ''
      }`}
    >
      <span
        className="w-[2.2em] shrink-0 text-center text-[1.7em] font-bold tabular-nums"
        aria-label={
          combatant.initiative === null ? 'No initiative' : `Initiative ${combatant.initiative}`
        }
      >
        {combatant.initiative ?? '—'}
      </span>

      <span className="min-w-0 flex-1">
        {/* Semibold even when idle: `font-medium` at this size is a weight you
            read on a phone in your hand, not one that survives the width of a
            table. */}
        <span className={`block truncate text-[1.6em] ${active ? 'font-bold' : 'font-semibold'}`}>
          {combatant.label}
        </span>
        {combatant.conditions.length > 0 ? (
          <span className="mt-[0.3em] flex flex-wrap gap-[0.4em]">
            {combatant.conditions.map((condition) => (
              // Conditions carry the state most likely to change what a player
              // does on their turn, so they are sized to a shade under the HP
              // and given a real border — a faint tint has no edge at distance.
              <Badge
                key={condition}
                variant="secondary"
                className="border-secondary-foreground/25 px-[0.6em] py-[0.15em] text-[0.95em] font-semibold"
              >
                {formatReferenceIndex(condition)}
              </Badge>
            ))}
          </span>
        ) : null}
      </span>

      {hp ? (
        <span className="shrink-0 text-right">
          <span className="block text-[1.4em] font-semibold tabular-nums">
            <span
              className={
                hp.current === 0
                  ? 'text-destructive'
                  : hp.current * 2 <= hp.max
                    ? 'text-hp-bloodied'
                    : undefined
              }
            >
              {hp.current}
            </span>
            <span className="text-muted-foreground">/{hp.max}</span>
            {hp.temp > 0 ? (
              <span className="text-hp-temp ml-[0.2em] text-[0.8em] font-semibold">+{hp.temp}</span>
            ) : null}
          </span>
          <span className="bg-muted mt-[0.3em] block h-[0.35em] w-[7em] overflow-hidden rounded-full">
            <span
              className={`block h-full rounded-full ${
                hp.current === 0
                  ? 'bg-destructive'
                  : hp.current * 2 <= hp.max
                    ? 'bg-hp-bloodied'
                    : 'bg-hp-healthy'
              }`}
              style={{
                width: `${
                  hp.max > 0 ? Math.min(100, ((hp.current + hp.temp) / hp.max) * 100) : 0
                }%`,
              }}
            />
          </span>
        </span>
      ) : null}
    </li>
  )
}

/**
 * The player-facing table screen (D24, `dm-run-suite/table-screen-cast`).
 *
 * It began as the fight on a wall and is now the table's shared screen: the
 * thing the DM has cast — a face, a place, the letter, one of the party's own
 * sheets, a page of the SRD — with the initiative order beside it when a fight
 * is running, and the DM's newest reveal when neither is up. Everything it
 * renders came through `GET /api/table/[token]`, sanitized at the data layer:
 * there is no monster HP here to accidentally show and no DM-only prep either.
 *
 * **It runs chromeless** — no site header, no tab bar, no legal footer; see
 * `hidesChrome` in `navigation/app-shell.tsx`. The screen owns the whole
 * viewport, so the layout here is a sticky title bar over a page that scrolls.
 *
 * **Sized for the far side of the table.** One font size on the root, every
 * rule below written in `em`, and a control in the header that moves it — which
 * is also the register's open TV-or-tablet question answered by handing it to
 * whoever is looking at the screen (`table-screen-legibility` shipped the
 * propped-device half; this is the other one).
 *
 * **Scroll-to-active over fit-to-screen.** Nobody is holding this device: when
 * the DM says "next!", the turn comes to the room rather than waiting for
 * someone to reach over and swipe.
 */
export function TableScreen({ token }: { token: string }) {
  const [view, setView] = useState<TableView | null>(null)
  const [dead, setDead] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sizeIndex, setSizeIndex] = useTextSize()
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

      const body = (await response.json()) as TableView
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

  // Both derived above the early returns, because the effect below them cannot
  // be: hooks run unconditionally, and `view` is null for the first poll. An
  // empty order is index -1, which matches no row.
  const encounter = view?.encounter ?? null
  const activeIndex =
    encounter && encounter.combatants.length > 0
      ? Math.min(encounter.activeTurn, encounter.combatants.length - 1)
      : -1
  const activeCombatantId =
    activeIndex < 0 ? null : (encounter?.combatants[activeIndex]?.id ?? null)

  useEffect(() => {
    const row = activeRowRef.current

    // No order yet, or a jsdom-shaped element without the method — either way
    // there is nothing to scroll and nothing to fail on.
    if (!row || typeof row.scrollIntoView !== 'function') return

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

  const spotlight = view.spotlight
  const order = encounter?.combatants ?? []
  // Two columns only when there is something to put in the second one, so a
  // screen with one thing on it is that one thing, full width.
  const twoUp = Boolean(spotlight) && order.length > 0

  return (
    // Full-bleed: the shell's chrome is off on this route, so the screen is the
    // whole viewport. The cap is wide enough that a 1080p TV fills it and only
    // an ultrawide sees a margin. The font size set here is what every `em`
    // below — and everything in `TableSpotlight` — is measured against.
    <main
      className="mx-auto flex min-h-dvh w-full max-w-[110rem] flex-col"
      style={{ fontSize: `${TEXT_SIZES[sizeIndex]}px` }}
    >
      {/* Sticky, because the page scrolls under it: the round number is the one
          thing that must not leave the screen when it does. */}
      <header className="bg-background sticky top-0 z-10 flex flex-wrap items-baseline justify-between gap-[0.8em] border-b px-[1.2em] py-[0.7em]">
        <div className="min-w-0">
          <h1 className="truncate text-[1.9em] font-bold">
            {encounter ? encounter.name : view.campaignName}
          </h1>
          <p className="text-muted-foreground text-[1em]">
            {encounter ? view.campaignName : 'At the table'}
          </p>
        </div>

        <div className="flex items-baseline gap-[0.8em]">
          {encounter ? (
            <p className="text-[1.9em] font-semibold tabular-nums">Round {encounter.round}</p>
          ) : null}

          {/* The one control on a screen nobody is meant to touch, and it is
              here because "can everyone read that?" is asked out loud at a
              table and answered by whoever is nearest the laptop. */}
          <span className="flex items-center gap-[0.3em]">
            <button
              type="button"
              aria-label="Smaller text"
              className="hover:bg-accent min-h-[1.8em] min-w-[1.8em] rounded-md border text-[1em] font-bold"
              onClick={() => setSizeIndex(sizeIndex - 1)}
              disabled={sizeIndex === 0}
            >
              A−
            </button>
            <button
              type="button"
              aria-label="Bigger text"
              className="hover:bg-accent min-h-[1.8em] min-w-[1.8em] rounded-md border text-[1.2em] font-bold"
              onClick={() => setSizeIndex(sizeIndex + 1)}
              disabled={sizeIndex === TEXT_SIZES.length - 1}
            >
              A+
            </button>
          </span>
        </div>
      </header>

      <div
        className={`flex-1 px-[1.2em] py-[1em] ${
          twoUp || (!spotlight && view.reveal)
            ? 'grid gap-[1em] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'
            : ''
        }`}
      >
        {/* What the DM cast takes the stage. The reveal card stands down while
            it is up: casting prep reveals it, so the two would be announcing
            the same thing twice, and the stage says it in full. */}
        {spotlight ? (
          <div className="lg:col-start-1 lg:row-start-1">
            <TableSpotlight spotlight={spotlight} token={token} />
          </div>
        ) : view.reveal ? (
          <RevealCard reveal={view.reveal} />
        ) : null}

        {order.length > 0 ? (
          <div
            className={
              spotlight ? 'lg:col-start-2 lg:row-start-1' : 'lg:col-start-1 lg:row-start-1'
            }
          >
            <ol className="space-y-[0.5em]" aria-label="Initiative order">
              {order.map((combatant, index) => (
                <CombatantRow
                  key={combatant.id}
                  combatant={combatant}
                  active={index === activeIndex}
                  rowRef={index === activeIndex ? activeRowRef : null}
                />
              ))}
            </ol>
          </div>
        ) : encounter ? (
          <p className="text-muted-foreground text-[1.2em]">
            The order is empty — the fight is brewing.
          </p>
        ) : spotlight ? null : (
          // Nothing cast, no fight: the screen still has a job, which is to
          // look like it is on and waiting rather than broken.
          <p className="text-muted-foreground text-[1.2em]">
            Nothing on the screen yet. Your DM will put something here.
          </p>
        )}
      </div>
    </main>
  )
}
