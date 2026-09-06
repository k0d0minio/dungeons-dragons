'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, type FormEvent } from 'react'

import { DifficultyReadout } from '@/components/encounters/difficulty-readout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  encounterDifficulty,
  levelOneWarnings,
  MAX_MONSTER_INSTANCES,
  MAX_MONSTER_LINES,
  type MonsterLine,
} from '@/lib/encounters/budget'
import { searchByName, useMonsterDetails, useMonsters } from '@/lib/srd/hooks'

/** A campaign character as the attendance list offers them. */
export interface AttendeeOption {
  id: string
  name: string
  level: number
}

/** Enough rows to find any monster by typing; the list has 331. */
const MONSTER_RESULT_LIMIT = 20

/**
 * The encounter builder (`dm-prep-suite/encounter-builder`).
 *
 * Encounters used to be a name field: type "Ambush at the bridge", land on the
 * tracker, and find out at the table whether four goblins was a scene or a
 * funeral. This is that field plus the two things the 2024 rules need to answer
 * the question — the monsters, and **who is turning up** — with the answer
 * recomputed on every tap.
 *
 * Attendance is a toggle rather than the campaign roster because a 5–6 player
 * table rarely arrives whole, and a budget computed for six when four show up
 * is the exact reading that gets somebody killed. The same ticks decide who is
 * seeded into the encounter as a PC row, because "who is fighting" and "who the
 * fight is measured against" are the same set, and asking twice would be a way
 * to get two different answers.
 *
 * It creates and it hands off. The tracker owns everything after Create —
 * initiative, HP, rounds — and nothing here reaches into it: this feeds
 * `src/lib/encounters/tracker.ts`, it does not extend it.
 */
export function EncounterBuilder({
  campaignId,
  roster,
}: {
  campaignId: string
  roster: AttendeeOption[]
}) {
  const router = useRouter()

  const [name, setName] = useState('')
  const [lines, setLines] = useState<MonsterLine[]>([])
  // Everyone is coming until the DM says otherwise: the common night, and the
  // budget it produces is the one an unedited encounter should be judged by.
  const [attending, setAttending] = useState<Set<string>>(() => new Set(roster.map((c) => c.id)))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const levels = useMemo(
    () => roster.filter((character) => attending.has(character.id)).map((c) => c.level),
    [roster, attending],
  )

  const difficulty = useMemo(() => encounterDifficulty(lines, levels), [lines, levels])

  // Average HP per instance comes from the stat blocks, one batched fetch for
  // whatever is on the list. A line whose detail has not landed yet saves with
  // null HP — untracked, and typed in on the tracker — rather than blocking
  // Create on a request the DM never asked for.
  const { details } = useMonsterDetails(lines.map((line) => line.index))

  // The level-1 rails (`first-table/level-one-rails`) read the same stat
  // blocks — CR and the attack lines — so they arrive with the HP, within a
  // few seconds of adding a monster, and say nothing for a party past level 2.
  const warnings = useMemo(
    () => levelOneWarnings({ lines, levels, details }),
    [lines, levels, details],
  )

  function addLine(monster: { index: string; name: string; experiencePoints: number }) {
    setLines((current) => {
      const existing = current.find((line) => line.index === monster.index)

      // Adding a monster already on the list is "one more of those", not a
      // second row of the same thing.
      if (existing) {
        return current.map((line) =>
          line.index === monster.index
            ? { ...line, count: Math.min(MAX_MONSTER_INSTANCES, line.count + 1) }
            : line,
        )
      }

      if (current.length >= MAX_MONSTER_LINES) return current
      return [...current, { ...monster, count: 1 }]
    })
  }

  function setCount(index: string, count: number) {
    setLines((current) =>
      count <= 0
        ? current.filter((line) => line.index !== index)
        : current.map((line) =>
            line.index === index
              ? { ...line, count: Math.min(MAX_MONSTER_INSTANCES, count) }
              : line,
          ),
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/encounters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          characterIds: roster
            .filter((character) => attending.has(character.id))
            .map((character) => character.id),
          monsters: lines.map((line) => ({
            monsterIndex: line.index,
            name: line.name,
            count: line.count,
            maxHitPoints: details[line.index]?.hitPoints ?? null,
          })),
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? 'That did not save. Try again.')
        return
      }

      const body = (await response.json()) as { encounter: { id: string } }
      router.push(`/dm/encounters/${body.encounter.id}`)
    } catch {
      setError('That did not send. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">The fight</CardTitle>
          <CardDescription>
            Name it now — the tracker is what the session actually uses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label htmlFor="encounter-name">Name</Label>
          <Input
            id="encounter-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Ambush at the bridge"
            maxLength={120}
            className="h-11"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who is turning up</CardTitle>
          <CardDescription>
            The budget is per character, so this is the whole difference between a scene and a
            funeral. These start in the encounter too.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roster.length > 0 ? (
            <ul className="space-y-1">
              {roster.map((character) => (
                <li key={character.id}>
                  <Label
                    htmlFor={`attending-${character.id}`}
                    className="hover:bg-accent flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 font-normal"
                  >
                    <Checkbox
                      id={`attending-${character.id}`}
                      checked={attending.has(character.id)}
                      onCheckedChange={(checked) =>
                        setAttending((current) => {
                          const next = new Set(current)
                          if (checked === true) next.add(character.id)
                          else next.delete(character.id)
                          return next
                        })
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{character.name}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      Level {character.level}
                    </span>
                  </Label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nobody has joined this campaign yet, so there is no budget to measure against. You can
              still build the fight and price it later.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monsters</CardTitle>
          <CardDescription>
            SRD 5.2.1 stat blocks. Adding one you already have makes it one more of those.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MonsterLines lines={lines} onCount={setCount} />
          <MonsterSearch
            onAdd={addLine}
            atLineLimit={lines.length >= MAX_MONSTER_LINES}
            chosen={lines.map((line) => line.index)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Difficulty</CardTitle>
          <CardDescription>
            The 2024 method: add the monsters&rsquo; XP and compare it to the party&rsquo;s budget.
            No multipliers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DifficultyReadout difficulty={difficulty} warnings={warnings} />
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full" disabled={submitting || !name.trim()}>
        {submitting ? 'Creating…' : 'Create encounter'}
      </Button>
    </form>
  )
}

/** The lines already on the fight, each with the stepper that prices it. */
function MonsterLines({
  lines,
  onCount,
}: {
  lines: MonsterLine[]
  onCount: (index: string, count: number) => void
}) {
  if (lines.length === 0) {
    return <p className="text-muted-foreground text-sm">Nothing in the fight yet.</p>
  }

  return (
    <ul className="space-y-2">
      {lines.map((line) => (
        <li key={line.index} className="flex items-center gap-2 rounded-md border p-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{line.name}</span>
            <span className="text-muted-foreground block text-xs tabular-nums">
              {line.experiencePoints.toLocaleString('en-GB')} XP each ·{' '}
              {(line.count * line.experiencePoints).toLocaleString('en-GB')} XP
            </span>
          </span>
          {/* At one, "one fewer" removes the line — a DM undoing a mistap should
              not have to find a separate delete button. */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            aria-label={line.count === 1 ? `Remove ${line.name}` : `One fewer ${line.name}`}
            onClick={() => onCount(line.index, line.count - 1)}
          >
            {line.count === 1 ? '×' : '−'}
          </Button>
          <span className="w-7 text-center text-lg font-semibold tabular-nums">{line.count}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            aria-label={`One more ${line.name}`}
            disabled={line.count >= MAX_MONSTER_INSTANCES}
            onClick={() => onCount(line.index, line.count + 1)}
          >
            +
          </Button>
        </li>
      ))}
    </ul>
  )
}

/** Search the monster list and add one. Prices come off the list row itself. */
function MonsterSearch({
  onAdd,
  atLineLimit,
  chosen,
}: {
  onAdd: (monster: { index: string; name: string; experiencePoints: number }) => void
  atLineLimit: boolean
  chosen: string[]
}) {
  const [query, setQuery] = useState('')
  const { monsters, isLoading } = useMonsters()

  // The list row carries `experiencePoints` (`serve.ts` puts it there for
  // exactly this), so the whole budget is computable without fetching a single
  // stat block. Only HP needs the detail, and only at save.
  const results = searchByName(monsters, query).slice(0, MONSTER_RESULT_LIMIT)
  const onList = new Set(chosen)

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="monster-search">Search monsters</Label>
        <Input
          id="monster-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. goblin"
          className="h-11"
        />
      </div>

      {atLineLimit ? (
        <p className="text-muted-foreground text-sm">
          {MAX_MONSTER_LINES} different stat blocks is the limit. Add more of the ones you have.
        </p>
      ) : isLoading ? (
        <p className="text-muted-foreground text-sm">Loading the monster list…</p>
      ) : results.length > 0 ? (
        <ul className="space-y-2">
          {results.map((monster) => (
            <li key={monster.index}>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-between gap-2"
                onClick={() =>
                  onAdd({
                    index: monster.index,
                    name: monster.name,
                    experiencePoints: monster.experiencePoints,
                  })
                }
              >
                <span className="min-w-0 truncate">{monster.name}</span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  CR {monster.challengeRatingText} ·{' '}
                  {monster.experiencePoints.toLocaleString('en-GB')} XP
                  {onList.has(monster.index) ? ' · on the list' : ''}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Nothing matches.</p>
      )}
    </div>
  )
}
