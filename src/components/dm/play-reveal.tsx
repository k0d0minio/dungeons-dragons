'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import { RevealSwitch } from '@/components/campaigns/reveal-switch'
import { DisclosureRow, ListNote, Section } from '@/components/dm/inset-list'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { summariseHidden, type HiddenReveal, type HiddenRevealKind } from '@/lib/db/reveals'

// Revealing, from the screen the party is being revealed to
// (`dm-chronology/play-tab`).
//
// The switches themselves are not new and are not re-implemented here: this is
// `RevealSwitch`, the same control the NPC, place and handout screens carry,
// gathered into one sheet. What is new is the *door*. Revealing the innkeeper
// as the party walks into his inn used to be a navigation into Prep, a scroll
// down a roster and a walk back to whatever was on screen; here it is the row,
// the switch, and the sheet closes.
//
// **Only names cross.** What the sheet is given is `listHiddenReveals`'
// projection — a kind, an id and a name — so the half of an NPC the DM turns
// his phone away for is not in this component's props at all. The reveal, when
// it happens, is the one thing on the Play tab that changes what the party's
// phones show, which is exactly what the switch's own sentence says it will.

interface RevealSheetState {
  hidden: HiddenReveal[]
  summary: string
  open: () => void
}

const RevealSheetContext = createContext<RevealSheetState | null>(null)

/** The reveal sheet, and the two places that open it. */
export function useRevealSheet(): RevealSheetState {
  const state = useContext(RevealSheetContext)

  if (!state) {
    throw new Error('useRevealSheet must be used inside PlayRevealProvider')
  }

  return state
}

/** The reveal switch's copy, per kind — the same words each prep screen uses. */
const KIND_COPY: Record<HiddenRevealKind, { noun: string; shows: string; path: string }> = {
  npc: {
    noun: 'NPC',
    shows: 'their name, your one-line summary, the description and the portrait',
    path: 'npcs',
  },
  location: {
    noun: 'place',
    shows: 'its name, your one-line summary and the description',
    path: 'locations',
  },
  handout: { noun: 'handout', shows: 'its title, the text and the picture', path: 'handouts' },
}

/**
 * Holds the reveal sheet for the whole Play tab, so the section row and the
 * toolbar button open the *same* sheet with the same list — reveal something
 * from one and the count on the other is already right.
 *
 * `children` is the server-rendered tab underneath: this is a client boundary
 * around it, not a client re-implementation of it.
 */
export function PlayRevealProvider({
  campaignId,
  initialHidden,
  children,
}: {
  campaignId: string
  initialHidden: HiddenReveal[]
  children: ReactNode
}) {
  const [hidden, setHidden] = useState(initialHidden)
  const [open, setOpen] = useState(false)

  const state = useMemo(
    () => ({ hidden, summary: summariseHidden(hidden), open: () => setOpen(true) }),
    [hidden],
  )

  return (
    <RevealSheetContext.Provider value={state}>
      {children}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Reveal to the party</SheetTitle>
            <SheetDescription>
              Everything you have written and not shown them yet. Their phones and the table screen
              catch up within a few seconds.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-6">
            {hidden.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nothing left hidden. Everything you have prepped is on their phones.
              </p>
            ) : (
              hidden.map((entry) => {
                const copy = KIND_COPY[entry.kind]

                return (
                  <div key={`${entry.kind}-${entry.id}`} className="space-y-2">
                    <h3 className="text-sm font-medium">
                      {entry.name}
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        {copy.noun}
                      </span>
                    </h3>
                    <RevealSwitch
                      endpoint={`/api/campaigns/${campaignId}/${copy.path}/${entry.id}/reveal`}
                      revealedAt={null}
                      noun={copy.noun}
                      shows={copy.shows}
                      // Nothing off the response is kept: the row's job is done
                      // the moment it is revealed, so it leaves the list rather
                      // than staying on screen as a switch to press back — the
                      // un-reveal lives on the prep screen, where the mistake
                      // is visible next to what was revealed.
                      unwrap={() => entry.id}
                      onChanged={(id) =>
                        setHidden((current) =>
                          current.filter((one) => !(one.id === id && one.kind === entry.kind)),
                        )
                      }
                    />
                  </div>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </RevealSheetContext.Provider>
  )
}

/**
 * The Reveal section: one row, saying what is still hidden, opening the sheet.
 *
 * One row rather than a list, because the answer at a table is nearly always
 * "none of it yet" and the question is only ever asked at the moment something
 * is met.
 */
export function PlayReveal() {
  const { hidden, summary, open } = useRevealSheet()

  return (
    <Section title="Reveal">
      {hidden.length > 0 ? (
        <DisclosureRow
          label={summary}
          detail="Show a person, a place or a letter to the party."
          onClick={open}
        />
      ) : (
        <ListNote>Nothing hidden — the party can see everything you have prepped.</ListNote>
      )}
    </Section>
  )
}
