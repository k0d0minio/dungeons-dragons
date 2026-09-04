'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserRole } from '@/lib/db/schema'

/** One account as the server page hands it over — dates as ISO strings. */
export interface RosterUser {
  id: string
  name: string
  email: string
  createdAt: string
  role: UserRole
  characterCount: number
  campaignCount: number
}

function joinedOn(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** What the dialog says is about to go, in the DM's terms rather than the schema's. */
function whatGoes(user: RosterUser): string {
  const parts: string[] = []

  if (user.characterCount > 0) {
    parts.push(
      user.characterCount === 1 ? 'their character' : `their ${user.characterCount} characters`,
    )
  }

  if (user.campaignCount > 0) parts.push('their place in the party')

  parts.push('their sign-in')

  return parts.join(', ')
}

/**
 * Every account, and the two controls the DM has over each: player or DM
 * (`user-management/invites-and-roles`, D19), and delete
 * (`triage/account-deletion-from-users-page`).
 *
 * The DM's own row carries neither. The route refuses a self-change and a
 * self-delete too; here the controls are simply absent, because a button that
 * always answers "no" is a worse control than none — and on the delete it is
 * the button whose "no" would come too late to be worth reading.
 *
 * Deleting is behind an alert dialog that names the person and counts what
 * goes with them. Confirming does not close it: the request is made with the
 * dialog still open, so a refusal — an account that still runs a campaign is
 * the one the DM will actually meet — is read where they are looking instead
 * of dropping them back on an unchanged list with no explanation.
 */
export function UserRoster({ users, selfId }: { users: RosterUser[]; selfId: string }) {
  const router = useRouter()
  const [rows, setRows] = useState(users)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function setRole(user: RosterUser, role: UserRole) {
    if (workingId) return
    setWorkingId(user.id)

    try {
      const response = await fetch(`/api/dm/users/${user.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'Could not change that role. Try again.')
        return
      }

      setRows((current) => current.map((row) => (row.id === user.id ? { ...row, role } : row)))
      toast.success(role === 'dm' ? `${user.name} is now a DM.` : `${user.name} is now a player.`)
    } catch {
      toast.error('Could not change that role. Check your connection.')
    } finally {
      setWorkingId(null)
    }
  }

  async function deleteAccount(user: RosterUser) {
    setDeleteError(null)
    setWorkingId(user.id)

    try {
      const response = await fetch(`/api/dm/users/${user.id}`, { method: 'DELETE' })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        setDeleteError(body?.error ?? `Could not delete this account (${response.status}).`)
        return
      }

      setConfirmingId(null)
      setRows((current) => current.filter((row) => row.id !== user.id))
      toast.success(`${user.name}’s account is gone.`)
      // Their invite rows went with them, and that card is server-rendered.
      router.refresh()
    } catch {
      setDeleteError('Could not reach the server. Check your connection and try again.')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Everyone with an account</CardTitle>
        <CardDescription>
          Whether or not they have joined a campaign yet. A DM can run campaigns and see this page;
          a player sees only their own characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nobody has signed up yet.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((user) => {
              const isSelf = user.id === selfId
              const busy = workingId === user.id

              return (
                <li key={user.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <span className="truncate font-medium">{user.name}</span>
                      <Badge variant={user.role === 'dm' ? 'default' : 'secondary'}>
                        {user.role === 'dm' ? 'DM' : 'Player'}
                      </Badge>
                      {isSelf ? <span className="text-muted-foreground text-xs">you</span> : null}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                    <p className="text-muted-foreground text-xs">
                      Joined {joinedOn(user.createdAt)} · {user.characterCount}{' '}
                      {user.characterCount === 1 ? 'character' : 'characters'} ·{' '}
                      {user.campaignCount} {user.campaignCount === 1 ? 'campaign' : 'campaigns'}
                    </p>
                  </div>

                  {isSelf ? null : (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-11"
                        disabled={workingId !== null}
                        onClick={() => setRole(user, user.role === 'dm' ? 'player' : 'dm')}
                      >
                        {user.role === 'dm' ? 'Make player' : 'Make DM'}
                      </Button>

                      <AlertDialog
                        open={confirmingId === user.id}
                        onOpenChange={(next) => {
                          if (busy) return
                          setConfirmingId(next ? user.id : null)
                          if (!next) setDeleteError(null)
                        }}
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="text-destructive size-11"
                            aria-label={`Delete ${user.name}`}
                            disabled={workingId !== null}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {user.name}’s account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes {whatGoes(user)}. There is no undo, and they would have
                              to sign up again on a fresh invite.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          {deleteError ? (
                            <p role="alert" className="text-destructive text-sm">
                              {deleteError}
                            </p>
                          ) : null}

                          <AlertDialogFooter>
                            <AlertDialogCancel className="h-11" disabled={busy}>
                              Keep them
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-11"
                              disabled={busy}
                              // Radix closes on action by default; hold it open
                              // so a refusal has somewhere to be read.
                              onClick={(event) => {
                                event.preventDefault()
                                void deleteAccount(user)
                              }}
                            >
                              {busy ? 'Deleting…' : 'Delete account'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
