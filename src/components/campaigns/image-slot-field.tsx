'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  ACCEPTED_IMAGE_LABEL,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_LABEL,
  formatImageSize,
  type ImageMeta,
} from '@/lib/images/schema'

// The one control that puts a picture on a prep entity
// (`dm-prep-suite/locations-handouts`).
//
// Used by the handout board and by the NPC roster's portrait, and written once
// because the interesting parts are not layout:
//
// - **The `<img>` src is the app's own authed route**, never a store address —
//   the server never sends one, so there is nothing here that could leak it.
//   The `?v=` is the upload timestamp: the URL is otherwise stable, and a
//   replaced picture must not keep showing the old one out of the browser's
//   cache.
// - **The size check happens twice**, here and on the server. This copy exists
//   only to save a DM on table wifi from sending four megabytes to be told no;
//   the one that matters is the server's, which is also the only one that
//   inspects the file's actual bytes.
// - **There is no URL box.** A field that took an address would be an SSRF, and
//   the way not to have one is to not build it.

/** Everything the control needs to talk to one entity's image endpoint. */
export function ImageSlotField<Entity>({
  endpoint,
  image,
  label,
  hint,
  alt,
  unwrap,
  onChanged,
}: {
  /** The entity's image route — `/api/campaigns/x/handouts/y/image`. */
  endpoint: string
  image: ImageMeta | null
  label: string
  hint: string
  /** What the picture is, for a reader who cannot see it. */
  alt: string
  /** Pull the updated entity out of the endpoint's JSON, at the call site. */
  unwrap: (body: unknown) => Entity
  onChanged: (entity: Entity) => void
}) {
  const [working, setWorking] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function send(request: Promise<Response>, failure: string) {
    setWorking(true)

    try {
      const response = await request

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? failure)
        return
      }

      onChanged(unwrap(await response.json()))
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setWorking(false)
      // Clearing the input is what makes picking the *same* file twice work —
      // a change event does not fire when the value has not changed.
      if (input.current) input.current.value = ''
    }
  }

  function upload(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`That image is over ${MAX_IMAGE_LABEL}. Share it at a smaller size.`)
      if (input.current) input.current.value = ''
      return
    }

    const body = new FormData()
    body.append('image', file)

    void send(fetch(endpoint, { method: 'POST', body }), 'That image did not upload. Try again.')
  }

  const inputId = `${endpoint}-file`

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>

      {image ? (
        <figure className="space-y-1">
          {/* Not `next/image`: this is an authed, private route with no known
              dimensions, so the optimizer has nothing to optimise and would
              only put a second fetch of a secret through a cache. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${endpoint}?v=${encodeURIComponent(image.uploadedAt)}`}
            alt={alt}
            className="max-h-64 w-full rounded-md border object-contain"
          />
          <figcaption className="text-muted-foreground text-xs">
            {formatImageSize(image.bytes)}
          </figcaption>
        </figure>
      ) : null}

      <input
        id={inputId}
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        disabled={working}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) upload(file)
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={working}
          onClick={() => input.current?.click()}
        >
          {working ? 'Working…' : image ? 'Replace image' : 'Add an image'}
        </Button>

        {image ? (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={working}
            onClick={() =>
              void send(
                fetch(endpoint, { method: 'DELETE' }),
                'That image did not come off. Try again.',
              )
            }
          >
            Remove image
          </Button>
        ) : null}
      </div>

      <p className="text-muted-foreground text-xs">
        {hint} {ACCEPTED_IMAGE_LABEL}, up to {MAX_IMAGE_LABEL}.
      </p>
    </div>
  )
}
