'use client'

// The stat block the DM reads mid-fight (`dm-run-suite/tracker-stat-blocks`).
//
// Deliberately *not* `MonsterDetail` from the Library, which this replaces on
// the tracker. That view is a reference browser: it leads with badges and a
// seven-cell grid of everything the SRD prints, and files Traits above Actions
// because that is the book's order. Read one-handed with initiative waiting,
// the order that matters is the one a DM actually asks in: what do I need to
// hit (AC), how much is left in it (HP), how far can it move (Speed), what
// does it do on its turn (Actions), and only then the rest.
//
// Nothing here changes the Library's own view, and nothing here is reachable
// from the public table screen — monster stats are DM-only by the screen they
// live on (D24: players do not even see monster HP).

import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatModifier, formatSenses, monsterActionNumbers, speedParts } from '@/lib/srd/format'
import { useMonster } from '@/lib/srd/hooks'
import type { SrdMonster, SrdMonsterEntry } from '@/lib/srd/types'

/** Which monster the sheet is showing, and the row's label for its title. */
export interface MonsterStatBlockSelection {
  index: string
  /** The combatant's label — `Goblin Warrior 2`, not the SRD's name. */
  label: string
}

const ABILITIES = [
  { key: 'strength', label: 'STR' },
  { key: 'dexterity', label: 'DEX' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'WIS' },
  { key: 'charisma', label: 'CHA' },
] as const

/** `Perception +6, Stealth +4` — only the skills the block prints a bonus for. */
function formatSkills(monster: SrdMonster): string | null {
  const skills = Object.entries(monster.skillBonuses)
    .filter(([, bonus]) => typeof bonus === 'number')
    .map(([skill, bonus]) => {
      const name = skill
        .replace(/_/g, ' ')
        .replace(/(^|\s)([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase())
      return `${name} ${formatModifier(bonus as number)}`
    })
  return skills.length > 0 ? skills.join(', ') : null
}

/**
 * One of the three numbers the whole sheet is built around. Large and
 * tabular so it reads at arm's length across a lit table; the sub-line
 * carries what the number is made of (the AC's source, the HP formula) at a
 * size that stays out of the way until the DM goes looking for it.
 */
function HeadlineNumber({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string | null
}) {
  return (
    <div className="bg-muted flex-1 rounded-lg border px-2 py-2 text-center">
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-2xl leading-tight font-bold tabular-nums">{value}</p>
      {detail ? <p className="text-muted-foreground text-xs">{detail}</p> : null}
    </div>
  )
}

/**
 * One action, bonus action, reaction or legendary action.
 *
 * The numbers the DM is about to roll are lifted out of the SRD sentence into
 * chips above it — to-hit or save DC, then reach, then damage — while the
 * sentence itself is printed whole underneath. The parse never removes text,
 * so a line it cannot read (a Multiattack, a spellcasting block) simply
 * appears as prose with no chips, which is exactly what it is.
 */
function ActionEntry({ entry }: { entry: SrdMonsterEntry }) {
  const numbers = monsterActionNumbers(entry.description)
  const roll = numbers.attackBonus ? `${numbers.attackBonus} to hit` : numbers.save

  return (
    <div className="rounded-lg border p-3">
      <h4 className="text-sm font-semibold">{entry.name}</h4>

      {roll || numbers.range || numbers.damage ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {roll ? <Badge className="tabular-nums">{roll}</Badge> : null}
          {numbers.range ? (
            <Badge variant="outline" className="tabular-nums">
              {numbers.range}
            </Badge>
          ) : null}
          {numbers.damage ? (
            <Badge variant="secondary" className="tabular-nums">
              {numbers.damage}
            </Badge>
          ) : null}
        </div>
      ) : null}

      <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
        {entry.description}
      </p>
    </div>
  )
}

function ActionGroup({ title, entries }: { title: string; entries: SrdMonsterEntry[] }) {
  if (entries.length === 0) return null

  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
        {title}
      </h3>
      {entries.map((entry) => (
        <ActionEntry key={entry.name} entry={entry} />
      ))}
    </section>
  )
}

/** A single label/value line in the closing block; absent when there is no value. */
function DetailLine({ label, value }: { label: string; value: string | null }) {
  if (!value) return null

  return (
    <div className="flex gap-2 text-sm">
      <dt className="text-muted-foreground w-32 shrink-0">{label}</dt>
      <dd className="min-w-0 flex-1">{value}</dd>
    </div>
  )
}

export function MonsterStatBlock({ index }: { index: string }) {
  const { monster, isLoading, error } = useMonster(index)

  if (isLoading) {
    return (
      <div className="py-12 text-center" role="status" aria-live="polite">
        <div className="border-gold mx-auto h-8 w-8 animate-spin rounded-full border-b-2" />
        <p className="text-muted-foreground mt-2">Loading stat block...</p>
      </div>
    )
  }

  if (error || !monster) {
    return (
      <div className="py-12 text-center">
        <Badge variant="destructive">Could not load this stat block</Badge>
        <p className="text-muted-foreground mt-2 text-sm">
          Check your connection and tap the row again.
        </p>
      </div>
    )
  }

  // Walking leads the headline; anything else the creature does — Fly, Swim,
  // Burrow, Climb — sits under it rather than shrinking the number.
  const speed = speedParts(monster)

  return (
    <div className="space-y-5">
      {/* The sheet's title is the combatant's label, which the DM may have
          renamed to "Snaggletooth" — so the creature it is actually running
          is named here, with the line the SRD prints under a stat block name. */}
      <p className="text-muted-foreground text-sm">
        {monster.name} · {monster.size} {monster.type} · CR {monster.challengeRatingText}
      </p>

      {/* What the DM is about to hit, how much of it there is, and how far it
          moves — the three questions a fight asks every round. Each cell's
          sub-line carries the working: the AC's source, the HP formula for a
          DM who rolls it, and every mode of movement past the first. */}
      <div className="flex gap-2">
        <HeadlineNumber
          label="AC"
          value={String(monster.armorClass)}
          detail={monster.armorDetail}
        />
        <HeadlineNumber label="HP" value={String(monster.hitPoints)} detail={monster.hitDice} />
        <HeadlineNumber
          label="Speed"
          value={speed[0] ?? '—'}
          detail={speed.slice(1).join(', ') || null}
        />
      </div>

      {/* Abilities carry their saving throw where the creature is proficient,
          rather than repeating the six of them in a separate Saves row — the
          DM calls for one save at a time and looks in one place for it. */}
      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ABILITIES.map(({ key, label }) => {
          const save = monster.savingThrows[key]

          return (
            <div key={key} className="bg-muted rounded-lg border px-1 py-2 text-center">
              <dt className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                {label}
              </dt>
              <dd className="text-base font-semibold tabular-nums">
                {formatModifier(monster.modifiers[key])}
                <span className="text-muted-foreground block text-[10px] font-normal">
                  {save === undefined ? monster.abilityScores[key] : `save ${formatModifier(save)}`}
                </span>
              </dd>
            </div>
          )
        })}
      </dl>

      <ActionGroup title="Actions" entries={monster.actions} />
      <ActionGroup title="Bonus actions" entries={monster.bonusActions} />
      <ActionGroup title="Reactions" entries={monster.reactions} />
      <ActionGroup title="Legendary actions" entries={monster.legendaryActions} />
      <ActionGroup title="Traits" entries={monster.traits} />

      {/* Everything that answers a question asked once a fight rather than
          once a round: what it resists, what it can see, what it speaks. */}
      <section className="space-y-2">
        <h3 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          Defences &amp; senses
        </h3>
        <dl className="space-y-1.5">
          <DetailLine label="Initiative" value={formatModifier(monster.initiativeBonus ?? 0)} />
          <DetailLine label="Skills" value={formatSkills(monster)} />
          <DetailLine label="Vulnerabilities" value={monster.damageVulnerabilities} />
          <DetailLine label="Resistances" value={monster.damageResistances} />
          <DetailLine label="Damage immunities" value={monster.damageImmunities} />
          <DetailLine label="Condition immunities" value={monster.conditionImmunities} />
          <DetailLine label="Senses" value={formatSenses(monster)} />
          <DetailLine label="Languages" value={monster.languages} />
        </dl>
      </section>
    </div>
  )
}

/**
 * The bottom sheet the tracker opens over the initiative order (DND-031).
 *
 * Bottom-anchored and 90dvh tall for the same reason the reference sheet is:
 * the close control and the scroll live in thumb reach, and the fight stays
 * visible behind it. The title is the *combatant's* label, so a DM running
 * three goblins knows which one they tapped.
 */
export function MonsterStatBlockSheet({
  selection,
  onClose,
}: {
  selection: MonsterStatBlockSelection | null
  onClose: () => void
}) {
  // Keep the last selection on screen while the sheet plays its close
  // animation, so the block does not blank out mid-slide. Adjusted during
  // render rather than in an effect — React re-renders immediately with the
  // new value instead of painting the stale one first
  // (react.dev/learn/you-might-not-need-an-effect).
  const [rendered, setRendered] = useState<MonsterStatBlockSelection | null>(selection)

  if (selection && selection !== rendered) {
    setRendered(selection)
  }

  return (
    <Sheet
      open={Boolean(selection)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="bottom"
        // Enlarge the sheet's built-in close button to a 44px touch target (NFR-002).
        className="h-[90dvh] gap-0 rounded-t-xl p-0 sm:mx-auto sm:max-w-2xl [&>button]:top-3 [&>button]:right-3 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md"
      >
        <SheetHeader className="border-b pr-14">
          <SheetTitle className="text-lg">{rendered?.label ?? ''}</SheetTitle>
          <SheetDescription>Stat block</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-10">
          {rendered ? <MonsterStatBlock index={rendered.index} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
