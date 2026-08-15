'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  REFERENCE_TYPE_LABELS,
  ReferenceDetailBody,
  type ReferenceSelection,
  type ReferenceType,
} from './reference-detail-body'

export type { ReferenceSelection, ReferenceType }

/**
 * Bottom sheet detail view for every reference type (DND-003).
 *
 * Bottom-anchored so the close control and scrollable body stay in thumb
 * reach one-handed; it becomes a centred panel once there is desktop room.
 */
export function ReferenceDetailSheet({
  selection,
  onClose,
}: {
  selection: ReferenceSelection | null
  onClose: () => void
}) {
  // Keep the last selection on screen while the sheet plays its close
  // animation, so the content does not blank out mid-slide.
  const [rendered, setRendered] = useState<ReferenceSelection | null>(selection)

  useEffect(() => {
    if (selection) setRendered(selection)
  }, [selection])

  return (
    <Sheet
      open={Boolean(selection)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="bottom"
        // Enlarge the sheet's built-in close button to a 44px touch target (NFR-002).
        className="h-[90dvh] gap-0 rounded-t-xl p-0 sm:mx-auto sm:max-w-2xl [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:top-3 [&>button]:right-3"
      >
        <SheetHeader className="border-b pr-14">
          <SheetTitle className="text-lg">{rendered?.name ?? ''}</SheetTitle>
          <SheetDescription>
            {rendered ? REFERENCE_TYPE_LABELS[rendered.type] : ''}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-10">
          {rendered && <ReferenceDetailBody selection={rendered} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
