'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'

interface CharacterOption {
  id: string
  name: string
  summary: string
}

/**
 * The player's half of a join link (DND-046): join, and your character comes
 * with you. Joining with none is allowed — you can be at the table before your
 * character exists — and joining twice is harmless.
 *
 * There is no picker any more (`first-table/one-character`): a player is their
 * character, so the form says who is joining and sends that one. A player who
 * somehow owns two sends both — the API still takes a list, deliberately, and
 * the seat is what matters.
 *
 * Joining with none no longer *ends* there, which is the loop
 * `guided-creation/wizard-frame` closes. A friend following Jamie's link on
 * their first evening has no characters, and landing them on an empty list was
 * the point the flow quietly stopped: they became a member, made a character
 * some other time, and it was never attached to the table — invisible to the
 * party glance, to encounter budgets and to milestone levelling. So the
 * zero-character path goes on into the guided wizard, carrying the campaign it
 * came from, and the character it produces joins the roster on completion.
 */
export function JoinCampaignForm({
  code,
  campaignName,
  characters,
}: {
  code: string
  campaignName: string
  characters: CharacterOption[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/campaigns/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, characterIds: characters.map((character) => character.id) }),
      })

      const body = (await response.json().catch(() => null)) as {
        error?: string
        campaign?: { id?: string }
      } | null

      if (!response.ok) {
        setError(body?.error ?? 'That did not work. Try again.')
        return
      }

      // A player with a character is done, and lands on it. A player with none
      // has the actual next step in front of them, so take them to it rather
      // than to a list with nothing in it.
      if (characters.length === 1) {
        router.push(`/characters/${characters[0].id}`)
        return
      }
      if (characters.length > 1) {
        router.push('/characters')
        return
      }

      router.push(
        body?.campaign?.id
          ? `/characters/new?campaign=${encodeURIComponent(body.campaign.id)}`
          : '/characters/new',
      )
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {characters.length > 0 ? (
        <ul className="space-y-2" aria-label="Joining as">
          {characters.map((character) => (
            <li key={character.id} className="flex min-h-11 items-center rounded-md border p-3">
              <span className="min-w-0">
                <span className="block truncate font-medium">{character.name}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {character.summary}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          You have no characters yet. Join the table and we&rsquo;ll walk you through making one —
          it takes a few minutes and everything is suggested for you.
        </p>
      )}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full" disabled={submitting}>
        {submitting
          ? 'Joining…'
          : characters.length > 0
            ? `Join ${campaignName}`
            : `Join ${campaignName} and make a character`}
      </Button>
    </form>
  )
}
