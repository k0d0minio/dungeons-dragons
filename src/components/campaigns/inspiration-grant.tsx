'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HEROIC_INSPIRATION } from '@/lib/characters/rules'

/**
 * The DM hands over Heroic Inspiration (`first-table/dm-character-profile`;
 * kept ungated, Jamie 2026-09-05). The starter box makes it a token passed
 * across the table because handing one over "feels more momentous"; this is
 * the same act on the DM's screen, written through the same combat-state
 * path the sheet's own card uses, so the player's phone shows it within a
 * poll and spends it from there.
 *
 * A toggle rather than a one-way grant: the mis-tap this control can suffer
 * is inspiring the wrong character, and taking it back is the mend.
 */
export function InspirationGrant({
  characterId,
  characterName,
  version,
  held,
}: {
  characterId: string
  characterName: string
  version: number
  held: boolean
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function toggle() {
    if (saving) return
    setSaving(true)

    try {
      const response = await fetch(`/api/characters/${characterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heroicInspiration: !held, version }),
      })

      if (response.status === 409) {
        toast.warning('Someone changed this character first. The page has refreshed — try again.')
      } else if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(payload?.error ?? 'That did not save. Try again.')
      } else {
        toast.success(
          held
            ? `Taken back from ${characterName}.`
            : `${characterName} has Heroic Inspiration. Their sheet shows it within a few seconds.`,
        )
      }
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setSaving(false)
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{HEROIC_INSPIRATION.label}</CardTitle>
        <CardDescription>
          For a good idea or a great moment. They hold one at a time and spend it to reroll any die.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant={held ? 'outline' : 'default'}
          className="h-11 w-full sm:w-auto"
          aria-pressed={held}
          disabled={saving}
          onClick={toggle}
        >
          {saving ? 'Saving…' : held ? 'Take it back' : `Grant it to ${characterName}`}
        </Button>
      </CardContent>
    </Card>
  )
}
