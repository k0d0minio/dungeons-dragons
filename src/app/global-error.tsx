'use client'

// The boundary of last resort (DND-025).
//
// `src/app/error.tsx` renders *inside* the root layout, so it cannot catch
// anything the root layout itself throws — and `src/app/layout.tsx` renders
// `SignedIn`, `SignedOut` and `UserButton` from `@neondatabase/auth`, a
// `0.5.0-beta` prerelease carrying the whole auth boundary. The single most
// likely thing to break was the one place with nothing underneath it, and the
// result was Next's unstyled built-in error page.
//
// A `global-error` replaces the entire document, so this file owns its own
// `<html>` and `<body>` and imports the stylesheet itself: the root layout
// never rendered, so nothing it pulls in is available here.

import { useEffect } from 'react'

import { captureError } from '@/lib/observability/sentry'

import './globals.css'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

// `globals.css` gates every `dark:` utility on a `.dark` class
// (`@custom-variant dark (&:is(.dark *))`), and the `next-themes` provider that
// normally puts it there lives inside the layout that just failed. Four lines
// of the same thing it does, so a crash at a dim table does not fire a white
// screen at everyone. The app offers no theme toggle, so the system preference
// is the whole answer.
const APPLY_COLOR_SCHEME = `try{if(matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}`

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    captureError(error, { boundary: 'global-error', digest: error.digest })
  }, [error])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_COLOR_SCHEME }} />
      </head>
      <body>
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center px-4 overflow-hidden">
          <div className="text-center max-w-2xl mx-auto">
            {/* Error Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 mb-6">
              <svg
                className="h-8 w-8 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            {/* Main Message */}
            <h1 className="text-3xl font-bold text-foreground mb-3">The app couldn&apos;t load</h1>
            <p className="text-lg text-muted-foreground mb-6">
              This one broke before the page did — reloading is the first thing to try. The details
              below are the useful bit to report.
            </p>

            {/* Error details */}
            <div className="bg-card rounded-xl shadow-lg p-5 border border-border mb-6">
              <div className="bg-muted rounded-lg p-3 text-left">
                <p className="text-xs text-foreground font-mono break-words">{error.message}</p>
                {error.digest && (
                  <p className="mt-2 text-xs text-muted-foreground font-mono">
                    Digest: {error.digest}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors shadow-sm hover:shadow-md"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try again
              </button>
              {/* A plain anchor, not `next/link`: the router lives in the tree
                  that just failed, so the way out has to be a fresh document
                  load rather than a client-side navigation into the wreckage. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="inline-flex items-center px-5 py-2.5 border border-border text-sm font-medium rounded-lg text-foreground bg-card hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors shadow-sm hover:shadow-md"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
