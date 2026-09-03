'use client'

import { useState, type ReactNode } from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { glossaryTerm, relatedTerms } from '@/lib/glossary/glossary'
import { cn } from '@/lib/utils'

/**
 * How the tappable word looks. `inline` sits inside a label or a sentence and
 * must not change the line box around it; `chip` is a standalone control in a
 * row of them.
 */
export type GlossaryTermVariant = 'inline' | 'chip'

/**
 * The inline trigger keeps the type it is set in — size, weight and colour all
 * inherited — and marks itself with a dotted underline, the one decoration a
 * reader already reads as "there is more here" without it competing with a
 * link.
 *
 * The 44px touch target (NFR-002) is the `::after` box, not the button: a term
 * inside a sentence cannot be 44px tall without pushing the line apart, so the
 * hit area is a transparent overlay centred on the word and the text keeps its
 * own height. `-translate-y-1/2` keeps it centred whatever the line height is.
 */
const INLINE_CLASS =
  "relative inline cursor-pointer rounded-xs underline decoration-dotted decoration-muted-foreground/70 underline-offset-4 hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"

/** A chip is its own control, so it can simply be 44px tall. */
const CHIP_CLASS =
  'inline-flex min-h-11 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

/**
 * A rules term rendered as tappable text that opens its plain-language
 * definition (`learn-to-play/glossary-popovers`).
 *
 * One component for every surface — the character sheet's labels, the rules
 * chapters' key terms, and the wizard and DM screens as they are built — so a
 * term means the same thing and looks the same wherever a player meets it.
 * D&D Beyond's every-term-a-popover pattern is the benchmark; the sheet is
 * bottom-anchored because a phone at a table is held one-handed.
 *
 * Unknown indexes render as their own words with no trigger at all, the same
 * fail-soft the SRD lookups take: a term this build has not written yet must
 * leave a readable label behind, not a dead control or a blank.
 *
 * The definition sheet is the term's own, not a shared one held higher up: a
 * definition is two sentences and mounts only while open, and a provider would
 * buy nothing but a context every card on the sheet had to be inside.
 */
export function GlossaryTerm({
  index,
  children,
  variant = 'inline',
  className,
}: {
  /** Glossary index — see `src/lib/glossary/terms.ts`. */
  index: string
  /**
   * The words as they read in place. A sheet tile says "AC" where the glossary
   * says "Armour Class (AC)", and the tile is right — so the trigger keeps the
   * caller's wording and the popover's heading carries the full term.
   */
  children?: ReactNode
  variant?: GlossaryTermVariant
  className?: string
}) {
  const [open, setOpen] = useState(false)
  // Which term the open sheet is showing. "See also" swaps it in place rather
  // than closing and reopening — following a chain of terms is the point of
  // having the chips — and it resets on close so reopening a term shows that
  // term.
  const [shownIndex, setShownIndex] = useState(index)

  const entry = glossaryTerm(index)
  if (!entry) return <>{children ?? index}</>

  const shown = glossaryTerm(shownIndex) ?? entry
  const related = relatedTerms(shown)
  const label = children ?? entry.term

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setShownIndex(index)
      }}
    >
      <SheetTrigger
        // The accessible name is the question the tap asks, not the word
        // itself: "AC, button" tells a screen-reader user nothing about what
        // happens, and the visible text stays exactly as the caller wrote it.
        aria-label={`What is ${entry.term}?`}
        data-glossary-term={entry.index}
        className={cn(variant === 'chip' ? CHIP_CLASS : INLINE_CLASS, className)}
      >
        {label}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        // Tall enough for the definition and its chips and no taller — this is
        // a popover that happens to be anchored to the bottom edge, so it
        // never takes the page away. The close control is grown to 44px the
        // way the reference detail sheet grows its own (NFR-002).
        className="h-auto max-h-[80dvh] gap-0 overflow-y-auto overscroll-contain rounded-t-2xl pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-md [&>button]:top-3 [&>button]:right-3 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md"
      >
        <SheetHeader className="pr-14">
          <SheetTitle className="text-lg">{shown.term}</SheetTitle>
          {/* The definition is the reason the sheet opened, so it is read at
              body size in the foreground colour rather than at the muted
              description size this slot usually carries. It stays the
              description for accessibility: it is what describes the dialog. */}
          <SheetDescription className="text-foreground text-[15px] leading-relaxed">
            {shown.definition}
          </SheetDescription>
        </SheetHeader>
        {related.length > 0 ? (
          <div className="px-4 pt-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              See also
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {related.map((other) => (
                <button
                  key={other.index}
                  type="button"
                  className={CHIP_CLASS}
                  onClick={() => setShownIndex(other.index)}
                >
                  {other.term}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
