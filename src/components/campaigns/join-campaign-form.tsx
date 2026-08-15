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

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? 'That did not work. Try again.')
        return
      }

      router.push('/characters')
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
          You have no characters yet — you can join now and create one afterwards.
        </p>
      )}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full" disabled={submitting}>
        {submitting ? 'Joining…' : `Join ${campaignName}`}
      </Button>
    </form>
  )
}
