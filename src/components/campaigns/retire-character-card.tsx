'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function messageForStatus(status: number): string {
  if (status === 401) return 'You have been signed out. Sign in again and try once more.'
  if (status === 404) return 'This character is already gone.'
  return `Could not retire this character (${status}).`
}

/**
 * The DM retires a character (`first-table/retire-a-character`; Jamie: only
 * the DM retires one). A confirmed act that deletes the row — the cascade
 * takes items, notes, the roster row and the combatant rows — and keeps the
 * player's seat, so their front door is the wizard again and the character
 * they make next attaches to this table (D36's loop). The player's own
 * Delete card went with this; the one place D13's boundary moved.
 *
 * The dialog names the character and the player, because the one thing worth
 * being certain of before tapping through is *which* friend's character is
 * about to go. Confirming does not close the dialog by itself: a failure is
 * read where the DM is looking.
 */
export function RetireCharacterCard({
  campaignId,
  characterId,
  characterName,
  playedBy,
}: {
  campaignId: string
  characterId: string
  characterName: string
  playedBy: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [retiring, setRetiring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    setError(null)
    setRetiring(true)

    try {
      const response = await fetch(`/api/characters/${characterId}`, { method: 'DELETE' })

      if (!response.ok) {
        setError(messageForStatus(response.status))
        return
      }

      setOpen(false)
      router.push(`/dm/campaigns/${campaignId}`)
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setRetiring(false)
    }
  }

  const player = playedBy ?? 'their player'

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base">Retire this character</CardTitle>
        <CardDescription>
          {characterName}&rsquo;s sheet goes, and {player} keeps their seat: their Character tab
          becomes the wizard, and the next character joins this table. There is no undo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog
          open={open}
          onOpenChange={(next) => {
            if (retiring) return
            setOpen(next)
            if (!next) setError(null)
          }}
        >
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" className="h-11 w-full sm:w-auto">
              Retire {characterName}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Retire {characterName}?</AlertDialogTitle>
              <AlertDialogDescription>
                Their sheet, inventory and your note on them go. {player} stays at the table and
                makes the next one.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel className="h-11" disabled={retiring}>
                Keep them
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 h-11 text-destructive-foreground"
                disabled={retiring}
                onClick={(event) => {
                  event.preventDefault()
                  void onConfirm()
                }}
              >
                {retiring ? 'Retiring…' : 'Retire'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
