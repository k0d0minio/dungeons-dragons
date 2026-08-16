'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** One field, one button: a campaign is a name and a DM (DND-046). */
export function CreateCampaignForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? 'That did not save. Try again.')
        return
      }

      setName('')
      router.refresh()
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor="campaign-name">New campaign</Label>
        <Input
          id="campaign-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Curse of the Wednesday Table"
          maxLength={120}
        />
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="h-11" disabled={submitting || !name.trim()}>
        {submitting ? 'Creating…' : 'Create'}
      </Button>
    </form>
  )
}
