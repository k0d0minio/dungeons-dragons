'use client'

import { useState, useSyncExternalStore, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * One link that makes the account *and* seats the person at this table
 * (`dm-chronology/one-link-invite`, D48).
 *
 * Bringing a friend in used to be two links sent on two evenings: an account
 * invite from `/dm/users`, then the campaign's join link once they had an
 * account. The invite carries the campaign now, so this is the only link a new
 * player ever needs — and the only thing the DM has to type is who it is for.
 *
 * The role is not offered. An invite minted here is for a player at this
 * table; a DM is a decision made on the people page, where the whole account
 * list is, and putting the radio group here would be offering it on the screen
 * where it is never the answer.
 *
 * Copy or share: `navigator.share` is the phone-native way to get a link into
 * WhatsApp, and it is what the DM actually does with it. It is absent on every
 * desktop browser worth naming, so the button only appears when the browser
 * has it, and copy is always there.
 *
 * Expiry and revocation are the invite's own rules, unchanged: two weeks, one
 * use, revocable from `/dm/users` — which is also where the link goes if this
 * sheet is closed before it is sent.
 */
export function CampaignInviteCard({
  campaignId,
  campaignName,
}: {
  campaignId: string
  campaignName: string
}) {
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  // A browser capability read the way React wants one read: `navigator` does
  // not exist on the server, so the server snapshot is a flat `false` and the
  // button appears on the client render that follows. Reading it in the
  // component body instead would make the two renders disagree, which is a
  // hydration error rather than a feature check. Nothing ever changes it, so
  // subscribing is a no-op.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === 'function',
    () => false,
  )

  // Path only at render time — `window` does not exist during server render;
  // the copy and share handlers run in the browser and prepend the real origin
  // there.
  const invitePath = token ? `/invite/${token}` : null

  function absolute(path: string): string {
    return `${window.location.origin}${path}`
  }

  async function create(event: FormEvent) {
    event.preventDefault()
    if (creating) return
    setCreating(true)

    try {
      const response = await fetch('/api/dm/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'player', label: label.trim(), campaignId }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'Could not make that invite. Try again.')
        return
      }

      const body = (await response.json()) as { invite: { token: string } }
      setToken(body.invite.token)
      toast.success('Invite made. Send them the link.')
    } catch {
      toast.error('Could not make that invite. Check your connection.')
    } finally {
      setCreating(false)
    }
  }

  async function copy() {
    if (!invitePath) return
    try {
      await navigator.clipboard.writeText(absolute(invitePath))
      toast.success('Invite link copied. Send it to them.')
    } catch {
      toast.error('Could not copy. Long-press the link text instead.')
    }
  }

  async function share() {
    if (!invitePath) return
    try {
      await navigator.share({
        title: `Join ${campaignName}`,
        text: `Come and play ${campaignName} with us. This link makes your account and puts you at the table.`,
        url: absolute(invitePath),
      })
    } catch {
      // A dismissed share sheet rejects exactly like a failed one, and telling
      // someone their own cancellation went wrong is worse than saying nothing.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invite someone to {campaignName}</CardTitle>
        <CardDescription>
          One link. They open it, make their account, and arrive already at this table with the
          character wizard in front of them. It works once and lasts two weeks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={create} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="campaign-invite-label">Who is it for?</Label>
            <Input
              id="campaign-invite-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Sam"
              autoComplete="off"
              maxLength={80}
            />
          </div>

          <Button type="submit" className="h-11 w-full" disabled={creating}>
            {creating ? 'Making…' : invitePath ? 'Make another link' : 'Make invite link'}
          </Button>
        </form>

        {invitePath ? (
          <div className="space-y-2">
            <p className="bg-muted text-muted-foreground rounded-md p-2 font-mono text-xs break-all select-all">
              {invitePath}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={copy}>
                Copy link
              </Button>
              {canShare ? (
                <Button type="button" variant="outline" className="h-11" onClick={share}>
                  Share
                </Button>
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs">
              Revoke it, or see every invite you have sent, on Everyone with an account.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
