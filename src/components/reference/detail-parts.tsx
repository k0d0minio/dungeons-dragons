'use client'

// Shared building blocks for the five reference detail views (DND-003).
// Mobile-first: single-column stacks, generous tap targets, progressive
// disclosure via short stat rows above long prose.

import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function DetailSection({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-2', className)}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

/** Two columns on the narrowest phone, three once there is room. */
export function StatGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</dl>
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null

  return (
    <div className="rounded-lg border bg-muted px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

/**
 * SRD prose. The local data holds a description as one string with newlines
 * where the SRD has a paragraph break, but a few sets (equipment) keep an array
 * of paragraphs, so both are accepted.
 */
export function DescriptionText({ desc }: { desc?: string[] | string | null }) {
  const paragraphs = Array.isArray(desc) ? desc : desc ? [desc] : []
  if (paragraphs.length === 0) return null

  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {paragraph}
        </p>
      ))}
    </div>
  )
}

/** Named SRD entries as badges — a class's proficiencies, an item's variants. */
export function ReferenceBadges({ items }: { items?: { index?: string; name: string }[] }) {
  if (!items?.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item.index ?? item.name} variant="secondary">
          {item.name}
        </Badge>
      ))}
    </div>
  )
}

export function StringBadges({ items }: { items?: string[] }) {
  if (!items?.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} variant="secondary" className="capitalize">
          {item}
        </Badge>
      ))}
    </div>
  )
}

/** Named blocks of prose — a monster's traits and actions, a class's features. */
export function NamedEntries({
  entries,
}: {
  entries?: Array<{ name: string; description: string | string[] }>
}) {
  if (!entries?.length) return null

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.name} className="rounded-lg border p-3">
          <h4 className="mb-1 text-sm font-semibold text-foreground">{entry.name}</h4>
          <DescriptionText desc={entry.description} />
        </div>
      ))}
    </div>
  )
}

export function DetailLoading({ label }: { label: string }) {
  return (
    <div className="py-12 text-center" role="status" aria-live="polite">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gold" />
      <p className="mt-2 text-muted-foreground">Loading {label}...</p>
    </div>
  )
}

export function DetailError({ label }: { label: string }) {
  return (
    <div className="py-12 text-center">
      <Badge variant="destructive">Error loading {label}</Badge>
      <p className="mt-2 text-sm text-muted-foreground">Check your connection and try again.</p>
    </div>
  )
}
