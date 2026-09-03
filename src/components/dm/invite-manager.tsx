'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { InviteStatus } from '@/lib/db/invites'
import type { UserRole } from '@/lib/db/schema'

/** One invite as the server page hands it over — dates as ISO strings. */
export interface InviteView {
  id: string
  token: string
  role: UserRole
  label: string | null
  email: string | null
  createdAt: string
  expiresAt: string
  status: InviteStatus
  /** The name of whoever claimed it, when the page could resolve one. */
  claimedByName: string | null
}

/** The shape `POST /api/dm/invites` and `DELETE /api/dm/invites/[id]` answer with. */
interface InviteRowResponse {
  invite: {
    id: string
    token: string
    role: string
    label: string | null
    email: string | null
    createdAt: string
    expiresAt: string
  }
}

function fromResponse(row: InviteRowResponse['invite'], status: InviteStatus): InviteView {
  return {
    id: row.id,
    token: row.token,
    role: row.role === 'dm' ? 'dm' : 'player',
    label: row.label,
    email: row.email,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    status,
    claimedByName: null,
  }
}

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
}

function describe(invite: InviteView): string {
  switch (invite.status) {
    case 'open': {
      const days = daysLeft(invite.expiresAt)
      return days <= 1 ? 'Expires today' : `Expires in ${days} days`
    }
    case 'claimed':
      return invite.claimedByName ? `Used by ${invite.claimedByName}` : 'Used'
    case 'revoked':
      return 'Revoked'
    case 'expired':
      return 'Expired'
  }
}

/**
 * The DM's invite links (`user-management/invites-and-roles`).
 *
 * One form makes a link for one person — a name so the list stays readable,
 * the role they get, and optionally an address so the link can go straight
 * into a mail. The list under it is the whole record, used and revoked
 * included; only an open link can be copied or revoked. Local state, like the
 * join-code card: the list the server rendered is the starting point, and
 * each answer from the API replaces one row.
 */
export function InviteManager({ invites }: { invites: InviteView[] }) {
  const [rows, setRows] = useState(invites)
  const [label, setLabel] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('player')
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function create(event: FormEvent) {
    event.preventDefault()
    if (creating) return
    setCreating(true)

    try {
      const response = await fetch('/api/dm/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, label: label.trim(), email: email.trim() }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'Could not make that invite. Try again.')
        return
      }

      const body = (await response.json()) as InviteRowResponse
      setRows((current) => [fromResponse(body.invite, 'open'), ...current])
      setLabel('')
      setEmail('')
      setRole('player')
      toast.success('Invite made. Copy the link and send it.')
    } catch {
      toast.error('Could not make that invite. Check your connection.')
    } finally {
      setCreating(false)
    }
  }

  async function revoke(invite: InviteView) {
    if (revokingId) return
    setRevokingId(invite.id)

    try {
      const response = await fetch(`/api/dm/invites/${invite.id}`, { method: 'DELETE' })

      if (!response.ok) {
        toast.error('Could not revoke that invite. Try again.')
        return
      }

      setRows((current) =>
        current.map((row) => (row.id === invite.id ? { ...row, status: 'revoked' } : row)),
      )
      toast.success('Invite revoked. The link no longer works.')
    } catch {
      toast.error('Could not revoke that invite. Check your connection.')
    } finally {
      setRevokingId(null)
    }
  }

  // Path only at render time — `window` does not exist during server render;
  // the copy handler runs in the browser and prepends the real origin there.
  function linkFor(invite: InviteView): string {
    return `/invite/${invite.token}`
  }

  async function copy(invite: InviteView) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${linkFor(invite)}`)
      toast.success('Invite link copied. Send it to them.')
    } catch {
      toast.error('Could not copy. Long-press the link text instead.')
    }
  }

  function mailtoFor(invite: InviteView): string | null {
    if (!invite.email) return null
    if (typeof window === 'undefined') return null

    const subject = encodeURIComponent('Your invite to the D&D table')
    const body = encodeURIComponent(
      `Here is your invite link: ${window.location.origin}${linkFor(invite)}\n\nIt works once, so open it on the phone you will play from.`,
    )

    return `mailto:${invite.email}?subject=${subject}&body=${body}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invite someone</CardTitle>
        <CardDescription>
          Each link is for one person and works once. They open it, make their account, and arrive
          already set up as a player (or, if you choose, a DM).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={create} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-label">Who is it for?</Label>
            <Input
              id="invite-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Sam"
              autoComplete="off"
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email (optional)</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="sam@example.com"
              autoComplete="off"
            />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">They will be a</legend>
            <RadioGroup
              value={role}
              onValueChange={(value) => setRole(value === 'dm' ? 'dm' : 'player')}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="player" id="invite-role-player" />
                <Label htmlFor="invite-role-player">Player</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="dm" id="invite-role-dm" />
                <Label htmlFor="invite-role-dm">DM</Label>
              </div>
            </RadioGroup>
          </fieldset>

          <Button type="submit" className="h-11 w-full" disabled={creating}>
            {creating ? 'Making…' : 'Make invite link'}
          </Button>
        </form>

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No invites yet.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((invite) => {
              const open = invite.status === 'open'
              const mailto = open ? mailtoFor(invite) : null

              return (
                <li key={invite.id} className="space-y-2 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {invite.label ?? 'Unnamed invite'}
                        </span>
                        <Badge variant={invite.role === 'dm' ? 'default' : 'secondary'}>
                          {invite.role === 'dm' ? 'DM' : 'Player'}
                        </Badge>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {describe(invite)}
                        {invite.email ? ` · ${invite.email}` : ''}
                      </p>
                    </div>
                    {open ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-11 shrink-0"
                        onClick={() => revoke(invite)}
                        disabled={revokingId !== null}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </div>

                  {open ? (
                    <>
                      <p className="bg-muted text-muted-foreground rounded-md p-2 font-mono text-xs break-all select-all">
                        {linkFor(invite)}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11"
                          onClick={() => copy(invite)}
                        >
                          Copy link
                        </Button>
                        {mailto ? (
                          <Button asChild variant="outline" className="h-11">
                            <a href={mailto}>Send by email</a>
                          </Button>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
