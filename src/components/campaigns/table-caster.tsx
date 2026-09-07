'use client'

// The DM's remote (`dm-run-suite/table-screen-cast`).
//
// One screen that drives the other screen. The alternative — a "show on the
// table" button on every prep row, the party glance and the tracker — was the
// first design and lost on the thing that actually happens at a table: casting
// is a *sequence*. The DM shows the face, then the place, then the letter, and
// between each one they are talking. Five buttons on five pages means five
// navigations mid-sentence; this is one page, open on the phone, with
// everything castable on it and the live one marked.
//
// **Casting reveals.** Every button here that shows a piece of prep also puts
// it on the party's phones, and the copy says so once rather than per row —
// see `setCampaignSpotlight`. That is what keeps the public screen and the
// players' own view from ever disagreeing about what the party knows.
//
// The SRD side is a search rather than a list: 331 monsters and 319 spells are
// not something to scroll past the handouts, and a DM reaching for one already
// has the name in mind.
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  isSameTarget,
  SPOTLIGHT_KIND_NOUN,
  type SpotlightTarget,
  type TableSpotlight,
} from '@/lib/campaigns/spotlight'
import { CONDITIONS } from '@/lib/srd/conditions'
import { searchByName, useMonsters, useSpells } from '@/lib/srd/hooks'

/** One castable thing, as a row on the remote. */
interface CastableRow {
  target: SpotlightTarget
  label: string
  /** The line under it — a summary, a class and level, a challenge rating. */
  detail?: string | null
  /** True when the party has not been shown this yet, so the copy can warn. */
  hidden?: boolean
}

/** What the page hands in: the campaign's own castable content. */
export interface TableCasterContent {
  characters: CastableRow[]
  npcs: CastableRow[]
  locations: CastableRow[]
  handouts: CastableRow[]
}

const REFERENCE_TABS = [
  { kind: 'monster', label: 'Monsters' },
  { kind: 'spell', label: 'Spells' },
  { kind: 'condition', label: 'Conditions' },
] as const

type ReferenceTab = (typeof REFERENCE_TABS)[number]['kind']

/** How many search hits are worth showing on a phone mid-scene. */
const MAX_REFERENCE_RESULTS = 8

/**
 * A list of castable things, with the live one marked.
 *
 * Declared here rather than inside the remote (react-hooks/static-components):
 * five of these render on one screen, and a component redeclared each render
 * would remount all five on every tap.
 */
function CastableRows({
  rows,
  empty,
  live,
  disabled,
  onCast,
}: {
  rows: CastableRow[]
  empty: string
  live: TableSpotlight | null
  disabled: boolean
  onCast: (target: SpotlightTarget) => void
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">{empty}</p>
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const isLive = isSameTarget(live, row.target)

        return (
          <li key={`${row.target.kind}-${'id' in row.target ? row.target.id : row.target.index}`}>
            <button
              type="button"
              // The whole row is the target: this is tapped one-handed, at a
              // table, while talking.
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md border p-3 text-left ${
                isLive ? 'border-primary bg-primary/10' : 'hover:bg-accent'
              }`}
              disabled={disabled}
              onClick={() => onCast(row.target)}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{row.label}</span>
                {row.detail ? (
                  <span className="text-muted-foreground block truncate text-xs">{row.detail}</span>
                ) : null}
              </span>

              <span className="flex shrink-0 items-center gap-2">
                {row.hidden ? (
                  <Badge variant="secondary" className="text-xs">
                    Hidden
                  </Badge>
                ) : null}
                <span className="text-muted-foreground text-xs font-medium">
                  {isLive ? 'On screen' : 'Show'}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function TableCaster({
  campaignId,
  campaignName,
  initialToken,
  initialSpotlight,
  content,
}: {
  campaignId: string
  campaignName: string
  initialToken: string | null
  initialSpotlight: TableSpotlight | null
  content: TableCasterContent
}) {
  const [token, setToken] = useState(initialToken)
  const [spotlight, setSpotlight] = useState(initialSpotlight)
  const [working, setWorking] = useState(false)
  const [tab, setTab] = useState<ReferenceTab>('monster')
  const [query, setQuery] = useState('')

  const monsters = useMonsters()
  const spells = useSpells()

  const tablePath = token ? `/table/${token}` : null

  /**
   * The search, over whichever reference list the tab names.
   *
   * Conditions come out of the bundle (they are fifteen rows and already
   * shipped); monsters and spells come from the public list endpoints, which
   * carry a name and little else — exactly what a picker needs.
   */
  const results = useMemo((): CastableRow[] => {
    const trimmed = query.trim()

    // All fifteen, unsliced and with nothing to type: the conditions are the
    // one reference list short enough to just be a list, and the DM reaching
    // for one is usually answering "what does Prone actually do" mid-turn.
    if (tab === 'condition') {
      const rows = trimmed ? searchByName([...CONDITIONS.all], trimmed) : [...CONDITIONS.all]
      return rows.map((condition) => ({
        target: { kind: 'condition', index: condition.index },
        label: condition.name,
      }))
    }

    // A search box over three hundred stat blocks with nothing typed is a wall,
    // so nothing is offered until there is something to match.
    if (trimmed.length < 2) return []

    if (tab === 'monster') {
      return searchByName(monsters.monsters ?? [], trimmed)
        .slice(0, MAX_REFERENCE_RESULTS)
        .map((monster) => ({
          target: { kind: 'monster', index: monster.index },
          label: monster.name,
          detail: `CR ${monster.challengeRatingText} · ${monster.type}`,
        }))
    }

    return searchByName(spells.spells ?? [], trimmed)
      .slice(0, MAX_REFERENCE_RESULTS)
      .map((spell) => ({
        target: { kind: 'spell', index: spell.index },
        label: spell.name,
        detail: spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`,
      }))
  }, [monsters.monsters, query, spells.spells, tab])

  async function cast(target: SpotlightTarget | null) {
    if (working) return
    setWorking(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/spotlight`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotlight: target }),
      })

      if (!response.ok) {
        toast.error('That did not reach the screen. Try again.')
        return
      }

      const body = (await response.json()) as {
        campaign: { tableSpotlight: TableSpotlight | null }
      }

      setSpotlight(body.campaign.tableSpotlight)
      toast.success(target ? 'It is on the table screen.' : 'Screen cleared.')
    } catch {
      toast.error('That did not send. Check your connection and try again.')
    } finally {
      setWorking(false)
    }
  }

  async function makeLink() {
    if (working) return
    setWorking(true)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/table-token`, { method: 'POST' })

      if (!response.ok) {
        toast.error('Could not make a new link. Try again.')
        return
      }

      const body = (await response.json()) as { campaign: { tableToken: string | null } }
      setToken(body.campaign.tableToken)
      toast.success('New table screen link made. The old one no longer works.')
    } catch {
      toast.error('Could not make a new link. Check your connection.')
    } finally {
      setWorking(false)
    }
  }

  async function copyLink() {
    if (!tablePath) return

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${tablePath}`)
      toast.success('Link copied. Open it on the screen everyone can see.')
    } catch {
      toast.error('Could not copy. Long-press the link text instead.')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">The screen everyone can see</CardTitle>
          <CardDescription>
            Open this link on the laptop at the end of the table and leave it there all night.
            Anyone with it sees what you put on the screen, the initiative order and player hit
            points — never monster hit points, and never anything behind your screen. No sign-in
            needed; make a new link to cut the old one off.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tablePath ? (
            <p className="bg-muted text-muted-foreground rounded-md p-2 font-mono text-xs break-all select-all">
              {tablePath}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              No live screen for {campaignName} yet. Make a link to open one.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {tablePath ? (
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => void copyLink()}
              >
                Copy link
              </Button>
            ) : null}
            <Button
              type="button"
              variant={tablePath ? 'outline' : 'default'}
              className="h-11"
              disabled={working}
              onClick={() => void makeLink()}
            >
              {working ? 'Working…' : tablePath ? 'New link' : 'Make a link'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* What is up right now, and the one control that takes it down. Its own
          card at the top because "get that off the screen" is the most urgent
          thing this page does — the party has just seen something early. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">On the screen now</CardTitle>
          <CardDescription aria-live="polite">
            {spotlight
              ? `${SPOTLIGHT_KIND_NOUN[spotlight.kind]} — the table is looking at it.`
              : 'Nothing. The screen is showing the fight, if one is running.'}
          </CardDescription>
        </CardHeader>
        {spotlight ? (
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={working}
              onClick={() => void cast(null)}
            >
              Clear the screen
            </Button>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your table</CardTitle>
          <CardDescription>
            A character sheet as the room may read it: who they are, armour class, hit points, the
            six abilities, saves and skills. No coins, no bags, no notes — theirs stays theirs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CastableRows
            rows={content.characters}
            empty="Nobody has brought a character to this table yet."
            live={spotlight}
            disabled={working || !token}
            onCast={(target) => void cast(target)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your prep</CardTitle>
          <CardDescription>
            Showing one of these <strong>reveals it</strong> — it lands on their phones too, and
            stays there. Only the public half ever crosses: what you wrote behind the screen stays
            behind it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              People
            </h3>
            <CastableRows
              rows={content.npcs}
              empty="No NPCs written yet."
              live={spotlight}
              disabled={working || !token}
              onCast={(target) => void cast(target)}
            />
          </section>
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              Places
            </h3>
            <CastableRows
              rows={content.locations}
              empty="No places written yet."
              live={spotlight}
              disabled={working || !token}
              onCast={(target) => void cast(target)}
            />
          </section>
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              Handouts
            </h3>
            <CastableRows
              rows={content.handouts}
              empty="No handouts staged yet."
              live={spotlight}
              disabled={working || !token}
              onCast={(target) => void cast(target)}
            />
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Out of the book</CardTitle>
          <CardDescription>
            For teaching, and for the moment somebody asks what Prone actually does. This is the SRD
            as the Library prints it — the page from the book, not what is left in the thing you are
            fighting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {REFERENCE_TABS.map((entry) => (
              <Button
                key={entry.kind}
                type="button"
                variant={tab === entry.kind ? 'default' : 'outline'}
                className="h-11 flex-1"
                onClick={() => setTab(entry.kind)}
              >
                {entry.label}
              </Button>
            ))}
          </div>

          {tab === 'condition' ? null : (
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tab === 'monster' ? 'Find a monster…' : 'Find a spell…'}
              aria-label={tab === 'monster' ? 'Find a monster' : 'Find a spell'}
              className="h-11"
            />
          )}

          <CastableRows
            rows={results}
            empty={tab === 'condition' ? 'No conditions found.' : 'Type a name to find it.'}
            live={spotlight}
            disabled={working || !token}
            onCast={(target) => void cast(target)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
