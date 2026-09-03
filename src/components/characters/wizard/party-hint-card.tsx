'use client'

import { Button } from '@/components/ui/button'
import type { PartyHint } from '@/lib/characters/party-balance'

/**
 * One gentle line about the party this character is joining
 * (`guided-creation/party-balance-hints`).
 *
 * Not an option row, on purpose: every row on a wizard step is something you
 * can pick, and this is the one thing on the class step that is not. It is a dashed aside — the same shape the NPC roster uses
 * for "here is something extra" — so it reads as a remark from the side of the
 * table rather than as a thirteenth class.
 *
 * The dismiss button is the whole promise of the feature: one tap and the nudge
 * is gone for the rest of the build. It is a real button with real words rather
 * than a bare ×, because on a phone a 44px target with "Got it" on it is both
 * easier to hit and easier to understand.
 */
export function PartyHintCard({ hint, onDismiss }: { hint: PartyHint; onDismiss: () => void }) {
  return (
    <aside
      aria-label="A note about your party"
      className="bg-muted/40 space-y-2 rounded-md border border-dashed p-3"
    >
      <p className="text-muted-foreground text-sm">{hint.text}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-9"
        onClick={onDismiss}
      >
        Got it
      </Button>
    </aside>
  )
}
