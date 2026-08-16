import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { SignedIn, SignedOut, UserButton } from '@neondatabase/auth/react/ui'
import { Button } from '@/components/ui/button'
import { AppShell } from '@/components/navigation/app-shell'
import { SiteFooter } from '@/components/site-footer'
import { Providers } from './providers'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  // The template keeps the app's name on every tab: child pages set short
  // titles ("Characters", "Character sheet") and compose into
  // "Characters · D&D 5e Companion" rather than replacing the name outright
  // (DND-041). One name, hardcoded on purpose — the old NEXT_PUBLIC_APP_NAME
  // override reached only the root title anyway, and was build-time inlined.
  title: {
    default: 'D&D 5e Companion',
    template: '%s · D&D 5e Companion',
  },
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    'A comprehensive D&D 5e companion app for character management and reference',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zoom is deliberately left alone (DND-022). Locking it bought nothing —
  // `ui/input.tsx` is already `text-base` on mobile, so iOS focus-zoom was
  // never a risk — and it cost a player at a dim table the one recourse they
  // have when a stat block is too small to read.
  // The phone's browser chrome is part of what glows at a dark table, so it
  // follows the system alongside the app itself. These are the two
  // `--background` values from globals.css, in hex because the meta tag needs
  // a colour the browser UI can parse.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // `suppressHydrationWarning` is required by next-themes: it writes the
    // theme class onto <html> in a blocking script before React hydrates, so
    // the server's markup and the client's necessarily differ on this element.
    // It suppresses the warning for <html> only, not for its subtree.
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {/* Navigation is the bottom bar (DND-029). What is left up here is
              only what is not a destination: the app's name, and the account
              controls, which are reached once a session rather than mid-fight. */}
          <header className="bg-background flex items-center justify-between gap-2 border-b p-4">
            <Link href="/" className="text-lg font-bold sm:text-xl">
              {process.env.NEXT_PUBLIC_APP_NAME || 'D&D 5e Companion'}
            </Link>
            <div className="flex items-center gap-2">
              <SignedOut>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/sign-up">Sign up</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </header>
          <AppShell>
            {children}
            <SiteFooter />
          </AppShell>
        </Providers>
      </body>
    </html>
  )
}
