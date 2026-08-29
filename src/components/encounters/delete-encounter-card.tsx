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

/**
 * Delete an encounter, behind a confirmation (DND-031) — the same shape as
 * deleting a character. The characters in it are untouched (their rows are
 * the source of truth); what goes is the order, the monsters and their HP.
 */
export function DeleteEncounterCard({
  encounterId,
  name,
  campaignId,
}: {
  encounterId: string
  name: string
  campaignId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    setError(null)
    setDeleting(true)

    try {
      const response = await fetch(`/api/encounters/${encounterId}`, { method: 'DELETE' })

      if (!response.ok) {
        setError(
          response.status === 404
            ? 'This encounter is already gone.'
            : `Could not delete this encounter (${response.status}).`,
        )
        return
      }

      setOpen(false)
      router.push(`/dm/campaigns/${campaignId}`)
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
        <CardTitle className="text-base">Delete this encounter</CardTitle>
        <CardDescription>
          Removes {name}, its initiative order and every monster&apos;s hit points. The characters
          themselves are untouched.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              Delete encounter
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
              <AlertDialogDescription>
                The order, the monsters and their hit points go with it. There is no undo.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel className="h-11" disabled={deleting}>
                Keep it
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 h-11 text-destructive-foreground"
                disabled={deleting}
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
