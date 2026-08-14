import { AuthView } from '@neondatabase/auth/react/ui'
import { authViewPaths } from '@neondatabase/auth/react/ui/server'

// Every Neon Auth view — sign-in, sign-up, sign-out, forgot-password,
// reset-password, email-verification, callback — is one route.
export const dynamicParams = false

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }))
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-4">
      <AuthView path={path} />
    </main>
  )
}
