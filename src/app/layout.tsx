import type { Metadata, Viewport } from 'next'
import { Lora } from 'next/font/google'
import { AppShell } from '@/components/navigation/app-shell'
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { isDm } from '@/lib/db/roles'
import { Providers } from './providers'
import './globals.css'

const lora = Lora({
  variable: '--font-display-serif',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  // The template keeps the app's name on every tab: child pages set short
  // titles ("Characters", "Character sheet") and compose into
  // "Characters · D&D 5e Companion" rather than replacing the name outright
  // (DND-041). The title is hardcoded on purpose: NEXT_PUBLIC_APP_NAME reached
  // only the root title, never the template, so a rename left every child tab
  // reading the old name. The override still applies to the site header's
  // link and to the site footer, and both are build-time inlined like any
  // NEXT_PUBLIC_* value — see `.env.example`.
  title: {
    default: 'D&D 5e Companion',
    template: '%s · D&D 5e Companion',
  },
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    'A comprehensive D&D 5e companion app for character management and reference',
  // Installable PWA (DND-048, D28): the manifest route is src/app/manifest.ts;
  // iOS reads these instead of the manifest for its own add-to-home-screen.
  appleWebApp: {
    capable: true,
    title: 'D&D 5e',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
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
    { media: '(prefers-color-scheme: light)', color: '#faf6ec' },
    { media: '(prefers-color-scheme: dark)', color: '#1d140d' },
  ],
}

/**
 * Whether the bottom bar draws the DM tab (`user-management/invites-and-roles`).
 *
 * Read here, in the one server component every page shares, so the bar is
 * right on first paint. Signed out there is no DM; without a database there
 * is no role to read, so the tab stays and the DM page explains the missing
 * `DATABASE_URL` itself. Reading the session makes every route dynamic — the
 * price of a bar that is never wrong, and since D34 every page but the front
 * door was behind a session check on each request anyway.
 */
async function showDmTab(): Promise<boolean> {
  const user = await getSessionUser()
  if (!user) return false
  if (!isDatabaseConfigured()) return true

  return isDm(user.id)
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const showDm = await showDmTab()

  return (
    // `suppressHydrationWarning` is required by next-themes: it writes the
    // theme class onto <html> in a blocking script before React hydrates, so
    // the server's markup and the client's necessarily differ on this element.
    // It suppresses the warning for <html> only, not for its subtree.
    <html lang="en" suppressHydrationWarning>
      <body className={`${lora.variable} antialiased`}>
        <Providers>
          <AppShell header={<SiteHeader />} footer={<SiteFooter />} showDm={showDm}>
            {children}
          </AppShell>
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  )
}
