import { AccountView } from '@neondatabase/auth/react/ui'
import { accountViewPaths } from '@neondatabase/auth/react/ui/server'

// Backs the account links in `<UserButton>` — without these routes that menu
// would point at 404s. Only the views this app actually enables: organisations,
// teams and API keys are Neon Auth features the companion doesn't use.
export const dynamicParams = false

const SUPPORTED_PATHS = [accountViewPaths.SETTINGS, accountViewPaths.SECURITY]

export function generateStaticParams() {
  return SUPPORTED_PATHS.map((path) => ({ path }))
}

export default async function AccountPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params

  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <AccountView path={path} />
    </main>
  )
}
