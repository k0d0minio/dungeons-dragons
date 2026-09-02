'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface CharacterOption {
  id: string
  name: string
  summary: string
}

/**
 * The player's half of a join link (DND-046): pick which of your characters
 * sit at this table, then join. Joining with none is allowed — you can be at
 * the table before your character exists — and joining twice is harmless.
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
  const [selected, setSelected] = useState<Set<string>>(
    // One character is the overwhelmingly common case — pre-tick it.
    () => new Set(characters.length === 1 ? [characters[0].id] : []),
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/campaigns/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, characterIds: [...selected] }),
      })

      const body = (await response.json().catch(() => null)) as {
        error?: string
        campaign?: { id?: string }
      } | null

      if (!response.ok) {
        setError(body?.error ?? 'That did not work. Try again.')
        return
      }

      // A player with characters is done — they picked which ones play here.
      // A player with none has the actual next step in front of them, so take
      // them to it rather than to a list with nothing in it.
      if (characters.length > 0) {
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
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Bring a character</legend>
          {characters.map((character) => (
            <label
              key={character.id}
              className="hover:bg-accent flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3"
            >
              <Checkbox
                checked={selected.has(character.id)}
                onCheckedChange={() => toggle(character.id)}
                aria-label={`Bring ${character.name}`}
              />
              <span className="min-w-0">
                <span className="block truncate font-medium">{character.name}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {character.summary}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
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
