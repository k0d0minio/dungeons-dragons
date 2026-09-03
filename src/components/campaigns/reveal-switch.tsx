'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { formatDiscoveredOn } from '@/lib/campaigns/discovered'

// The DM's reveal switch (`dm-run-suite/reveal-controls`).
//
// One control, on all three prep screens, because "the party can see this now"
// must mean and look like the same thing whether it is a person, a place or a
// letter. What it is trying to be:
//
// - **One tap, with the consequence written next to it.** This is pressed at a
//   table with players a foot away and a phone held at an angle, mid-sentence.
//   A confirmation dialog would be a second tap for the misclick this control
//   already has an undo for, and a dialog is where the sentence explaining what
//   happens would go to be dismissed unread — so the sentence lives on the
//   control, permanently, and says what the party will get.
// - **Un-reveal is the same switch, not a repair.** Revealing the wrong NPC in
//   the wrong scene is the mistake this feature will actually make, and the fix
//   has to be one tap in the place the mistake was made. `revealStamp(false)`
//   clears the timestamp, so an un-revealed thing is hidden again everywhere —
//   including a handout's picture, whose bytes go back behind the check.
// - **It never says "instantly".** The party's phones poll every 15 s and the
//   table screen every 5 s (D25/D24), so the honest promise is "in a few
//   seconds", and that is what it promises.

/** How the party's surfaces refresh — said plainly, because a DM waits on it. */
const POLL_BLURB = 'Their phones and the table screen catch up within a few seconds.'

export function RevealSwitch<Entity>({
  endpoint,
  revealedAt,
  noun,
  shows,
  unwrap,
  onChanged,
}: {
  /** The entity's reveal route — `/api/campaigns/x/npcs/y/reveal`. */
  endpoint: string
  /** The column, straight off the row: a timestamp when shown, null when not. */
  revealedAt: Date | string | null
  /** What this is, in the sentences below — "NPC", "place", "handout". */
  noun: string
  /**
   * The public layer, named. Completes "Your players will see …", so it is a
   * list of what actually crosses — never a promise the query does not keep.
   */
  shows: string
  /** Pull the updated entity out of the endpoint's JSON, at the call site. */
  unwrap: (body: unknown) => Entity
  onChanged: (entity: Entity) => void
}) {
  const [working, setWorking] = useState(false)

  const revealed = revealedAt !== null

  async function toggle() {
    if (working) return

    const next = !revealed
    setWorking(true)

    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revealed: next }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'That did not change. Try again.')
        return
      }

      onChanged(unwrap(await response.json()))
      toast.success(next ? 'Your players can see it now.' : 'Hidden again.')
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="bg-muted/40 space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Announced, not just repainted: the DM may well be looking at the
            table rather than the phone when the tap lands. */}
        <p className="text-sm font-medium" aria-live="polite">
          {revealed
            ? `Your players can see this ${noun}.`
            : `Only you can see this ${noun} so far.`}
        </p>

        <Button
          type="button"
          variant={revealed ? 'outline' : 'default'}
          className="h-11"
          disabled={working}
          onClick={() => void toggle()}
        >
          {working
            ? revealed
              ? 'Hiding…'
              : 'Revealing…'
            : revealed
              ? 'Hide it again'
              : 'Reveal to players'}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        {revealed
          ? `Revealed ${formatDiscoveredOn(revealedAt)}. Hiding it again takes ${shows} back off their campaign screen, and off the table screen. Nothing you wrote is lost.`
          : `Revealing shows ${shows}. ${POLL_BLURB} Your behind-the-screen notes stay yours either way.`}
      </p>
    </div>
  )
}
