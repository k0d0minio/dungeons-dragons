import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { PWAInstallButton, OfflineIndicator, ServiceWorkerUpdate } from "@/lib/pwa/hooks";
import { CustomUserButton } from "@/components/CustomUserButton";
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
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        elements: {
          // Add custom styling if needed
        }
      }}
      // Add retry configuration for chunk loading
      dangerouslyDisableClerkJS={false}
    >
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
          <OfflineIndicator />
          <header className="flex justify-between items-center p-4 border-b bg-white dark:bg-gray-900">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {process.env.NEXT_PUBLIC_APP_NAME || "D&D 5e Companion"}
            </h1>
            <div className="flex gap-4 items-center">
              <PWAInstallButton />
              <SignedOut>
                <SignInButton />
                <SignUpButton />
              </SignedOut>
              <SignedIn>
                <CustomUserButton />
              </SignedIn>
            </div>
          </header>
          <main>
            {children}
          </main>
          <ServiceWorkerUpdate />
        </body>
      </html>
    </ClerkProvider>
  );
}
