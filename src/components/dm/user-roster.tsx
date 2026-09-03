'use client'

import { useState } from 'react'
import { toast } from 'sonner'

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

/**
 * Every account, and the one switch the DM has over each: player or DM
 * (`user-management/invites-and-roles`, D19).
 *
 * The DM's own row carries no switch. The route refuses a self-change too;
 * here the control is simply absent, because a button that always answers
 * "no" is a worse control than none.
 */
export function UserRoster({ users, selfId }: { users: RosterUser[]; selfId: string }) {
  const [rows, setRows] = useState(users)
  const [workingId, setWorkingId] = useState<string | null>(null)

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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 shrink-0"
                      disabled={workingId !== null}
                      onClick={() => setRole(user, user.role === 'dm' ? 'player' : 'dm')}
                    >
                      {user.role === 'dm' ? 'Make player' : 'Make DM'}
                    </Button>
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
