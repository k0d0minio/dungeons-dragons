import { TableScreen } from '@/components/encounters/table-screen'

// Client-polled live data; nothing here to prerender.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Table screen',
}

/**
 * The shared table screen (D24). **Public by design** — this path is not in
 * `src/proxy.ts`'s matcher, and must not be added to it: the token in the URL
 * is the whole credential, and what it unlocks is only the sanitized view the
 * data layer builds (initiative order, conditions, PC HP — never monster HP).
 * The client component owns fetching, so a dead token shows its friendly
 * message rather than a 404 page.
 */
export default async function TableScreenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  return <TableScreen token={token} />
}
