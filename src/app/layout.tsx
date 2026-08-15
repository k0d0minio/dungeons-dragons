import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@neondatabase/auth/react/ui";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <header className="bg-background flex items-center justify-between gap-2 border-b p-4">
            <Link href="/" className="text-lg font-bold sm:text-xl">
              {process.env.NEXT_PUBLIC_APP_NAME || "D&D 5e Companion"}
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
                <Button asChild variant="ghost" size="sm">
                  <Link href="/characters">Characters</Link>
                </Button>
                <UserButton />
              </SignedIn>
            </div>
          </header>
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
