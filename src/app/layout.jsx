import '@/styles/tailwind.css'
import '@/styles/mobile.css'
import '@/styles/mobile-wise-elder.css'
import '@/styles/animations.css'
import '@/styles/toolbox.css'
import { AuthProvider } from '../contexts/AuthContext'
import ErrorBoundary from '../components/ui/ErrorBoundary'

export const metadata = {
  title: {
    template: '%s - D&D',
    default:
      'Dungeons & Dragons - The Grand Archive',
  },
  description:
    'Dungeons & Dragons - The Grand Archive.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full bg-white antialiased">
      <head>
        <link
          rel="preconnect"
          href="https://cdn.fontshare.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap"
        />
      </head>
        <body className="flex min-h-full">
          <ErrorBoundary>
            <AuthProvider>
              <div className="w-full">{children}</div>
            </AuthProvider>
          </ErrorBoundary>
        </body>
    </html>
  )
}
