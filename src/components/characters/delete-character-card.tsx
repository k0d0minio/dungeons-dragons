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
  return `Could not delete this character (${status}).`
}

/**
 * Delete a character, behind a confirmation (DND-018).
 *
 * There is no undo — the row goes, spells, hit points and all — so the dialog
 * names the character rather than asking "are you sure?" about an unnamed
 * something. The one thing worth being certain of before tapping through is
 * *which* character is about to go, and a player with two of them is reading
 * this on a phone.
 *
 * Confirming does not close the dialog by itself: the request is made with it
 * still open, so a delete that failed says so where the player is looking
 * instead of dropping them back on an unchanged page with no explanation.
 */
export function DeleteCharacterCard({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    setError(null)
    setDeleting(true)

    try {
      const response = await fetch(`/api/characters/${id}`, { method: 'DELETE' })

      if (!response.ok) {
        setError(messageForStatus(response.status))
        return
      }

      setOpen(false)
      // The list is server-rendered from an owner-scoped query, so without the
      // refresh it would come back still showing the character just deleted.
      router.push('/characters')
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base">Delete this character</CardTitle>
        <CardDescription>
          Removes {name} and everything on their sheet. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <AlertDialog
          open={open}
          onOpenChange={(next) => {
            if (deleting) return
            setOpen(next)
            if (!next) setError(null)
          }}
        >
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" className="h-11 w-full sm:w-auto">
              Delete character
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Their sheet, spells and tracked hit points go with them. There is no undo.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel className="h-11" disabled={deleting}>
                Keep them
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 h-11 text-destructive-foreground"
                disabled={deleting}
                // Radix closes on action by default; hold it open so a failed
                // delete has somewhere to be read.
                onClick={(event) => {
                  event.preventDefault()
                  void onConfirm()
                }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
