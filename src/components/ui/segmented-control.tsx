'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

/**
 * The iOS segmented control (Apple HIG), built on the same Radix Tabs
 * primitive as `ui/tabs.tsx`.
 *
 * A segmented control is not a tab strip: the segments are equal-width and
 * fill their container, the selected one is a raised thumb on a recessed
 * track, and the set is fixed — segments never appear or disappear between
 * renders, because the position of a segment is how you find it without
 * reading. Use `Tabs` when the set is data-driven and the labels vary in
 * width; use this when a fixed handful of views share one screen.
 *
 * Selection still carries the full tab semantics Radix gives it — roving
 * focus, arrow keys, `role="tablist"` — so the control is operable by
 * keyboard and announced correctly even though it does not look like tabs.
 */
function SegmentedControl({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="segmented-control"
      className={cn('flex flex-col gap-3', className)}
      {...props}
    />
  )
}

function SegmentedControlList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="segmented-control-list"
      className={cn(
        // `grid-flow-col auto-cols-fr` is the equal-width rule: four segments
        // each take a quarter whatever their labels say, so "Play" and
        // "Spells" are the same size and neither moves when the other is
        // selected.
        'bg-muted grid w-full auto-cols-fr grid-flow-col items-stretch gap-0.5 rounded-lg p-[3px]',
        className,
      )}
      {...props}
    />
  )
}

function SegmentedControlItem({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="segmented-control-item"
      className={cn(
        // `min-h-11` is the app's 44px thumb target. The thumb is a raised
        // card-coloured pill rather than a coloured fill: on the parchment
        // palette a primary-filled segment reads as a pressed button, which is
        // the wrong affordance for "this is the view you are looking at".
        'text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground focus-visible:ring-ring inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,background-color,box-shadow] focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

function SegmentedControlPanel({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="segmented-control-panel"
      className={cn('outline-none', className)}
      {...props}
    />
  )
}

export { SegmentedControl, SegmentedControlItem, SegmentedControlList, SegmentedControlPanel }
