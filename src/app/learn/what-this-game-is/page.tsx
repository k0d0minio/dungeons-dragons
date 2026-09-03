import { LearnChapter } from '@/components/learn/learn-chapter'
import { loadLearnChapter } from '@/lib/learn/load'

// Baked at build time from the repo's own markdown, and behind the sign-in
// wall like every other page (D34).
export const dynamic = 'force-static'

export const metadata = {
  title: 'What this game actually is',
}

/** `docs/learn/01-what-this-game-is.md` rendered in-app. */
export default async function WhatThisGameIsLearnPage() {
  const markdown = await loadLearnChapter('01-what-this-game-is.md')

  return <LearnChapter markdown={markdown} slug="what-this-game-is" />
}
