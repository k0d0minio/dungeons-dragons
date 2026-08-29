'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * The iOS large-title page header (Apple HIG), shared by the app's screens.
 *
 * A large serif title that collapses to a small nav-bar title as the page
 * scrolls past the top, with the chrome gaining a transluscent blur and a
 * hairline so content reads through it. Optional back link and trailing
 * actions. This is the pattern the top-level tab surfaces and their detail
 * pages share — the shell the `navigation-shell` epic establishes.
 *
 * The collapse is driven by window scroll (the app's pages scroll the
 * document, not an inner container). Pages that are shorter than the fold
 * never collapse, which is the same as Safari's own behaviour.
 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  backHref?: string
  backLabel?: string
  actions?: ReactNode
  className?: string
}) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'bg-background/85 sticky top-0 z-30 -mx-4 -mt-4 mb-4 backdrop-blur transition-[border-color,box-shadow]',
        collapsed ? 'border-b' : 'border-b border-transparent',
        className,
      )}
    >
      <div className="mx-auto flex w-full flex-col justify-end px-4 pb-3 pt-3">
        {backHref ? (
          <Link
            href={backHref}
            className="focus-visible:ring-ring -ml-2 inline-flex min-h-11 items-center gap-0.5 self-start text-[0.9rem] text-muted-foreground focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{backLabel ?? 'Back'}</span>
          </Link>
        ) : null}

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1
              className={cn(
                'font-serif font-bold text-foreground transition-[font-size,line-height]',
                collapsed ? 'text-xl' : 'text-3xl leading-tight sm:text-4xl',
              )}
            >
              {title}
            </h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </header>
  )
}
