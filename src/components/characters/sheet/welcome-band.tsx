'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { claimCharacterWelcome } from '@/lib/characters/welcome-flag'
import { LEARN_TOTAL_MINUTES } from '@/lib/learn/chapters'

/**
 * One band at the head of a brand-new character's sheet
 * (`triage/creation-completion-learn-link`).
 *
 * The wizard hands the player straight to their sheet and says nothing about
 * it. This is the something: it names them, says the sheet is the player's
 * now, and offers `/learn` — which is the point of the band, because the
 * thirty seconds after a character exists is when somebody is likeliest to
 * read six pages about how to play them.
 *
 * A band and not a screen, on purpose. The wizard's last tap has always landed
 * on the character rather than on a page about the character, and a completion
 * step between the two would take that away to say less.
 *
 * Renders nothing at all unless {@link claimCharacterWelcome} says this sheet
 * is being opened for the first time since it was made — which for every other
 * character, every other device, and every browser that will not store
 * anything, is never.
 */
export function WelcomeBand({ characterId, name }: { characterId: string; name: string }) {
  const [welcoming, setWelcoming] = useState(false)
  // The claim happens in an effect rather than in render, twice over: the sheet
  // is server-rendered, so reading `localStorage` during render would hydrate
  // into a mismatch — and claiming is a *write*, which render may not do.
  const claimed = useRef(false)

  useEffect(() => {
    // StrictMode runs this twice in development. The second pass would find the
    // note already taken and hide a band that had every right to be there.
    if (claimed.current) return
    claimed.current = true

    setWelcoming(claimCharacterWelcome(characterId))
  }, [characterId])

  if (!welcoming) return null

  return (
    <aside
      aria-label={`${name} is ready`}
      className="border-primary/30 bg-primary/5 mb-4 space-y-3 rounded-lg border p-4"
    >
      <div className="space-y-1">
        <p className="font-semibold">{name} is ready.</p>
        <p className="text-muted-foreground text-sm">
          This sheet is yours now — everything {name} can do is on it, and it keeps between
          sessions. Never played before? Six short pages, about {LEARN_TOTAL_MINUTES} minutes, will
          get you through session 1.
        </p>
      </div>

      {/* "Got it" rather than a bare ×, matching the wizard's party hint: on a
          phone a 44px target with words on it is both easier to hit and easier
          to understand. Dismissing only hides the band — the note behind it was
          spent on the first render, so there is nothing left to clear. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild className="h-11">
          <Link href="/learn">Learn to play</Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground h-11"
          onClick={() => setWelcoming(false)}
        >
          Got it
        </Button>
      </div>
    </aside>
  )
}
