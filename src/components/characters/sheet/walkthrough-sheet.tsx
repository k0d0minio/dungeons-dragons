'use client'

import { useState } from 'react'

import { GlossaryTerm } from '@/components/glossary/glossary-term'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatModifier } from '@/lib/characters/display'
import type { RollWalkthrough } from '@/lib/characters/walkthrough'

/**
 * The section heading every block of the walkthrough carries — the four steps
 * of a roll, in the order a player performs them.
 */
function Step({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
      {children}
    </h3>
  )
}

/**
 * The walkthrough itself, without the sheet around it.
 *
 * Split out because the spell walkthrough is *inside* the cast flow rather
 * than a layer over it: a player mid-cast should see what to roll and what the
 * slot costs on one screen, not one on top of the other. Everything else on
 * the sheet opens it as {@link WalkthroughSheet} instead.
 *
 * Four blocks, in the order the roll happens: pick up the die, add these, beat
 * that, then this happens. The order is the teaching — a first-time player who
 * reads only the first block has still learned the thing they were stuck on.
 */
export function WalkthroughBody({ walkthrough }: { walkthrough: RollWalkthrough }) {
  return (
    <div className="space-y-4">
      <section>
        <Step>Pick up</Step>
        {walkthrough.die ? (
          <div className="bg-muted/50 flex items-start gap-3 rounded-md border p-3">
            <span className="text-xl font-bold tabular-nums">{walkthrough.die.notation}</span>
            <span className="text-sm leading-relaxed">{walkthrough.die.why}</span>
          </div>
        ) : (
          <div className="bg-muted/50 rounded-md border p-3">
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">No die — not for you.</span> This one makes someone
              else roll. Read on for the number they are rolling against.
            </p>
          </div>
        )}
      </section>

      {walkthrough.modifiers.length > 0 ? (
        <section>
          <Step>{walkthrough.die ? 'Add' : 'The number, and where it comes from'}</Step>
          <ul>
            {walkthrough.modifiers.map((line) => (
              <li
                key={line.label}
                className="border-b py-2 last:border-b-0"
                aria-label={`${line.label} ${formatModifier(line.value)}. ${line.why}`}
              >
                {/* The row's whole meaning is on the `aria-label` above, so
                    the visual halves are decoration — except the glossary
                    trigger, which is a control of its own and stays exposed
                    the way the vitals tiles keep theirs. */}
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">
                    {line.term ? (
                      <GlossaryTerm index={line.term}>{line.label}</GlossaryTerm>
                    ) : (
                      <span aria-hidden>{line.label}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-base font-semibold tabular-nums" aria-hidden>
                    {formatModifier(line.value)}
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed" aria-hidden>
                  {line.why}
                </p>
              </li>
            ))}
          </ul>

          {walkthrough.total !== null ? (
            <div
              className="mt-2 flex items-baseline justify-between gap-3 rounded-md border px-3 py-2"
              // The one number the player is actually looking for, spelled out
              // rather than left to be read off a row of arithmetic.
              aria-label={
                walkthrough.die
                  ? `Add ${formatModifier(walkthrough.total)} in total`
                  : `Your difficulty class is ${walkthrough.total}`
              }
            >
              <span className="text-sm font-medium" aria-hidden>
                {walkthrough.die ? 'Add in total' : 'Your DC'}
              </span>
              <span className="text-xl font-bold tabular-nums" aria-hidden>
                {walkthrough.die ? formatModifier(walkthrough.total) : String(walkthrough.total)}
              </span>
            </div>
          ) : null}
        </section>
      ) : null}

      {walkthrough.target ? (
        <section>
          <Step>Beat</Step>
          <div className="rounded-md border p-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">
                {walkthrough.target.term ? (
                  <GlossaryTerm index={walkthrough.target.term}>
                    {walkthrough.target.label}
                  </GlossaryTerm>
                ) : (
                  walkthrough.target.label
                )}
              </span>
              <span className="shrink-0 text-base font-semibold tabular-nums">
                {walkthrough.target.value === null ? '?' : walkthrough.target.value}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {walkthrough.target.detail}
            </p>
          </div>
        </section>
      ) : null}

      {walkthrough.outcomes.length > 0 ? (
        <section>
          <Step>Then</Step>
          <ul className="space-y-2">
            {walkthrough.outcomes.map((outcome) => (
              <li key={outcome.label} className="rounded-md border p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">
                    {outcome.term ? (
                      <GlossaryTerm index={outcome.term}>{outcome.label}</GlossaryTerm>
                    ) : (
                      outcome.label
                    )}
                  </span>
                  {outcome.dice ? (
                    <span className="shrink-0 text-base font-semibold tabular-nums">
                      {outcome.dice}
                    </span>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  {outcome.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {walkthrough.notes.length > 0 ? (
        <ul className="space-y-1">
          {walkthrough.notes.map((note) => (
            <li key={note} className="text-muted-foreground text-xs leading-relaxed">
              {note}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Tap a thing on the sheet, learn the roll
 * (`learn-to-play/roll-walkthroughs`).
 *
 * The highest-value teaching surface the research found: a beginner reading
 * "Longsword +6" knows neither which die that goes on, nor where the 6 came
 * from, nor what to compare the result against. Tapping the row says all
 * three, and then what happens next.
 *
 * **The app never rolls** (register decision D8). Every number in here is a
 * statement about a roll the player makes with their own physical dice —
 * there is no randomness in this component, in `walkthrough.ts`, or anywhere
 * behind them. "Pick up the d20" is the whole point.
 *
 * Bottom-anchored and content-sized, like the cast flow and the glossary
 * popover it sits beside: a phone at a table is held one-handed, and a
 * walkthrough opened mid-turn must not take the sheet away underneath it.
 *
 * Numbers come from `walkthrough.ts`, which computes every one of them out of
 * the rules engine in `src/lib/characters/` — this component formats, and
 * derives nothing.
 */
export function WalkthroughSheet({
  walkthrough,
  onClose,
}: {
  walkthrough: RollWalkthrough | null
  onClose: () => void
}) {
  // Kept on screen through the close animation, exactly as the cast sheet does
  // it, so the body does not blank out mid-slide.
  const [rendered, setRendered] = useState<RollWalkthrough | null>(walkthrough)

  if (walkthrough && walkthrough !== rendered) {
    setRendered(walkthrough)
  }

  return (
    <Sheet
      open={Boolean(walkthrough)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 rounded-t-xl p-0 sm:mx-auto sm:max-w-lg [&>button]:top-3 [&>button]:right-3 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md"
      >
        <SheetHeader className="border-b pr-14">
          <SheetTitle className="text-lg">{rendered?.title ?? ''}</SheetTitle>
          <SheetDescription>
            {rendered?.term ? (
              <GlossaryTerm index={rendered.term}>{rendered.subtitle}</GlossaryTerm>
            ) : (
              (rendered?.subtitle ?? '')
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {rendered ? <WalkthroughBody walkthrough={rendered} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
