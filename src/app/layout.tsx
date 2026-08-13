import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@neondatabase/auth/react/ui";
import { PWAInstallButton, OfflineIndicator, ServiceWorkerUpdate } from "@/lib/pwa/hooks";
import { Button } from "@/components/ui/button";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "D&D 5e Companion",
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "A comprehensive D&D 5e companion app for character management and reference",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "D&D Companion",
  },
  icons: {
    icon: "/icons/icon-192x192.svg",
    apple: "/icons/icon-192x192.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="D&D Companion" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <OfflineIndicator />
          <header className="bg-background flex items-center justify-between gap-2 border-b p-4">
            <Link href="/" className="text-lg font-bold sm:text-xl">
              {process.env.NEXT_PUBLIC_APP_NAME || "D&D 5e Companion"}
            </Link>
            <div className="flex items-center gap-2">
              <PWAInstallButton />
              <SignedOut>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/sign-up">Sign up</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/characters">Characters</Link>
                </Button>
                <UserButton />
              </SignedIn>
            </div>
          </header>
          {children}
          <ServiceWorkerUpdate />
        </Providers>
      </body>
    </html>
  );
}
