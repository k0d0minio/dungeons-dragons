'use client'

// What the DM has put on the table screen (`dm-run-suite/table-screen-cast`).
//
// The screen used to show one thing, the fight, and it existed only while a
// fight did. This is the other thing it shows: whatever the DM cast — a face,
// a place, the letter, one of the party's own sheets, or a page out of the
// SRD — rendered for a laptop at the end of the table with five people reading
// it from the far side.
//
// **Everything is sized in `em`.** The screen's root sets one font size and
// carries a control that changes it, so "make it bigger" is one number and
// every headline, badge and stat tile moves together. A `rem` ladder — which
// is what the rest of the app uses, correctly, on phones — would ignore that
// control entirely.
//
// **Reference kinds fetch their own content.** A cast monster, spell or
// condition arrives here as an index, and the SRD data comes from the public
// CDN-cached endpoints the Library reads (D34) — never through the table
// token. That is what keeps a stat block on the wall the *book's* page rather
// than a leak of this campaign's fight: the goblin's remaining hit points are
// not in this component's reach.
import { CONDITIONS } from '@/lib/srd/conditions'
import { formatModifier, formatSenses, speedParts } from '@/lib/srd/format'
import { useMonster, useSpell } from '@/lib/srd/hooks'
import { formatComponents, formatDuration, formatSpellLevel } from '@/lib/srd/format'
import type { SrdMonster, SrdMonsterEntry, SrdSpell } from '@/lib/srd/types'
import { SPOTLIGHT_KIND_LABEL } from '@/lib/campaigns/spotlight'
import type { SpotlightView, TableSheet } from '@/lib/db/table'

/** Prep is written as paragraphs; blank lines are what separates them. */
function paragraphsOf(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
}

/** The name of the thing, and the one word saying what kind of thing it is. */
function SpotlightHeading({ kind, name }: { kind: SpotlightView['kind']; name: string }) {
  return (
    <header>
      <p className="text-primary text-[0.85em] font-bold tracking-widest uppercase">
        {SPOTLIGHT_KIND_LABEL[kind]}
      </p>
      <h2 className="mt-[0.2em] text-[2.4em] leading-tight font-bold break-words">{name}</h2>
    </header>
  )
}

function Prose({ text }: { text: string | null }) {
  const paragraphs = paragraphsOf(text)
  if (paragraphs.length === 0) return null

  return (
    <div className="space-y-[0.6em]">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-[1.15em] leading-snug whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  )
}

/**
 * The picture, when the cast thing has one.
 *
 * One URL, with no entity in it — `/api/table/<token>/image` serves whatever
 * is on the screen right now, and nothing else is reachable through it. The
 * `?v=` is the upload stamp, so replacing a picture is not served from cache.
 */
function SpotlightImage({
  token,
  uploadedAt,
  alt,
  className,
}: {
  token: string
  uploadedAt: string | null
  alt: string
  className?: string
}) {
  if (!uploadedAt) return null

  // The bytes come off a dynamic, token-gated route: the image optimiser
  // cannot fetch it, and caching a private handout at the edge is exactly what
  // must not happen.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/table/${token}/image?v=${encodeURIComponent(uploadedAt)}`}
      alt={alt}
      className={className ?? 'max-h-[45vh] w-auto rounded-lg border object-contain'}
    />
  )
}

/** One number with its name under it — AC, HP, Speed, and the rest. */
function StatTile({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="bg-muted/50 rounded-lg border px-[0.6em] py-[0.4em] text-center">
      <p className="text-muted-foreground text-[0.7em] font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="text-[1.5em] leading-tight font-bold tabular-nums">{value}</p>
      {sub ? <p className="text-muted-foreground text-[0.7em]">{sub}</p> : null}
    </div>
  )
}

/** A row of "name +bonus" pairs — the saves, and the eighteen skills. */
function CheckList({ title, checks }: { title: string; checks: TableSheet['skills'] }) {
  return (
    <section>
      <h3 className="text-muted-foreground text-[0.8em] font-bold tracking-widest uppercase">
        {title}
      </h3>
      <ul className="mt-[0.3em] grid grid-cols-2 gap-x-[1em] gap-y-[0.15em] sm:grid-cols-3">
        {checks.map((check) => (
          <li
            key={check.label}
            className={`flex items-baseline justify-between gap-[0.5em] text-[1.05em] ${
              check.proficient ? 'font-semibold' : 'text-muted-foreground'
            }`}
          >
            <span className="truncate">
              {/* Proficiency is a dot rather than a word: at this size a
                  legend costs a line the sheet does not have, and the dot is
                  the mark on the paper sheet it is standing in for. */}
              <span aria-hidden className={check.proficient ? 'text-primary' : 'opacity-30'}>
                ●
              </span>{' '}
              {check.label}
              {check.expertise ? <span className="text-primary"> ●</span> : null}
            </span>
            <span className="tabular-nums">{formatModifier(check.modifier)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** A character sheet, stripped — see `src/lib/campaigns/table-sheet.ts`. */
function SheetSpotlight({ sheet, token }: { sheet: TableSheet; token: string }) {
  const line = [
    `Level ${sheet.level}`,
    sheet.speciesLabel,
    sheet.subclassLabel ? `${sheet.subclassLabel} ${sheet.classLabel}` : sheet.classLabel,
  ].join(' · ')

  return (
    <div className="space-y-[0.8em]">
      <div className="flex items-start gap-[0.8em]">
        <SpotlightImage
          token={token}
          uploadedAt={sheet.portraitUploadedAt}
          alt={sheet.name}
          className="h-[4em] w-[4em] shrink-0 rounded-full border object-cover"
        />
        <div className="min-w-0">
          <SpotlightHeading kind="character" name={sheet.name} />
          <p className="text-muted-foreground mt-[0.2em] text-[1.1em]">{line}</p>
          {sheet.backgroundLabel ? (
            <p className="text-muted-foreground text-[0.95em]">{sheet.backgroundLabel}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[0.5em] sm:grid-cols-6">
        <StatTile label="Armour class" value={String(sheet.armorClass)} />
        <StatTile
          label="Hit points"
          value={`${sheet.hitPoints.current}/${sheet.hitPoints.max}`}
          sub={sheet.hitPoints.temp > 0 ? `+${sheet.hitPoints.temp} temp` : null}
        />
        <StatTile label="Speed" value={`${sheet.speed} ft`} />
        <StatTile label="Initiative" value={formatModifier(sheet.initiative)} />
        <StatTile label="Proficiency" value={formatModifier(sheet.proficiencyBonus)} />
        <StatTile label="Passive perc." value={String(sheet.passivePerception)} />
      </div>

      <div className="grid grid-cols-3 gap-[0.5em] sm:grid-cols-6">
        {sheet.abilities.map((ability) => (
          <StatTile
            key={ability.key}
            label={ability.abbreviation}
            value={formatModifier(ability.modifier)}
            sub={String(ability.score)}
          />
        ))}
      </div>

      {sheet.conditions.length > 0 || sheet.exhaustion > 0 ? (
        <p className="text-[1.05em] font-semibold">
          {[
            ...sheet.conditions.map((condition) => CONDITIONS.get(condition)?.name ?? condition),
            ...(sheet.exhaustion > 0 ? [`Exhaustion ${sheet.exhaustion}`] : []),
          ].join(' · ')}
        </p>
      ) : null}

      <div className="grid gap-[0.8em] lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <CheckList title="Saving throws" checks={sheet.savingThrows} />
        <CheckList title="Skills" checks={sheet.skills} />
      </div>
    </div>
  )
}

/** Traits and actions, as the stat block prints them. */
function MonsterEntries({ title, entries }: { title: string; entries: SrdMonsterEntry[] }) {
  if (entries.length === 0) return null

  return (
    <section>
      <h3 className="text-muted-foreground text-[0.8em] font-bold tracking-widest uppercase">
        {title}
      </h3>
      <ul className="mt-[0.3em] space-y-[0.4em]">
        {entries.map((entry) => (
          <li key={entry.name} className="text-[1.05em] leading-snug">
            <span className="font-bold">{entry.name}.</span> {entry.description}
          </li>
        ))}
      </ul>
    </section>
  )
}

function MonsterSpotlight({ monster }: { monster: SrdMonster }) {
  return (
    <div className="space-y-[0.8em]">
      <SpotlightHeading kind="monster" name={monster.name} />
      <p className="text-muted-foreground text-[1.1em]">
        {monster.size} {monster.type}
        {monster.alignment ? `, ${monster.alignment}` : ''} · CR {monster.challengeRatingText}
      </p>

      <div className="grid grid-cols-3 gap-[0.5em] sm:grid-cols-6">
        <StatTile
          label="Armour class"
          value={String(monster.armorClass)}
          sub={monster.armorDetail}
        />
        <StatTile label="Hit points" value={String(monster.hitPoints)} sub={monster.hitDice} />
        <StatTile label="Speed" value={speedParts(monster).join(', ') || '—'} />
        {(['strength', 'dexterity', 'constitution'] as const).map((ability) => (
          <StatTile
            key={ability}
            label={ability.slice(0, 3).toUpperCase()}
            value={formatModifier(monster.modifiers[ability])}
            sub={String(monster.abilityScores[ability])}
          />
        ))}
      </div>

      <p className="text-muted-foreground text-[0.95em]">{formatSenses(monster)}</p>

      <MonsterEntries title="Traits" entries={monster.traits} />
      <MonsterEntries title="Actions" entries={monster.actions} />
    </div>
  )
}

function SpellSpotlight({ spell }: { spell: SrdSpell }) {
  const components = formatComponents(spell)

  return (
    <div className="space-y-[0.8em]">
      <SpotlightHeading kind="spell" name={spell.name} />
      <p className="text-muted-foreground text-[1.1em]">
        {formatSpellLevel(spell.level)} {spell.school}
      </p>

      <div className="grid grid-cols-2 gap-[0.5em] sm:grid-cols-4">
        <StatTile label="Casting time" value={spell.castingTime} />
        <StatTile label="Range" value={spell.range} />
        <StatTile label="Duration" value={formatDuration(spell)} />
        <StatTile label="Components" value={components ?? '—'} />
      </div>

      <Prose text={spell.description} />
    </div>
  )
}

/** Waiting on the SRD fetch, or told about one that failed. */
function ReferenceStatus({ message }: { message: string }) {
  return <p className="text-muted-foreground text-[1.2em]">{message}</p>
}

function ReferenceSpotlight({
  spotlight,
}: {
  spotlight: SpotlightView & { kind: 'monster' | 'spell' | 'condition' }
}) {
  // Hooks run unconditionally; the null index is how each one is told to stay
  // idle when this is not its kind.
  const monster = useMonster(spotlight.kind === 'monster' ? spotlight.index : null)
  const spell = useSpell(spotlight.kind === 'spell' ? spotlight.index : null)

  if (spotlight.kind === 'condition') {
    const condition = CONDITIONS.get(spotlight.index)

    // Conditions ship in the bundle rather than over HTTP (they are creation-
    // critical and tiny), so there is nothing to wait for and nothing to fail.
    return condition ? (
      <div className="space-y-[0.8em]">
        <SpotlightHeading kind="condition" name={condition.name} />
        <Prose text={condition.description} />
      </div>
    ) : (
      <ReferenceStatus message="That is not a condition this book knows." />
    )
  }

  if (spotlight.kind === 'monster') {
    if (monster.error) return <ReferenceStatus message="Could not reach the monster manual." />
    return monster.monster ? (
      <MonsterSpotlight monster={monster.monster} />
    ) : (
      <ReferenceStatus message="Finding it…" />
    )
  }

  if (spell.error) return <ReferenceStatus message="Could not reach the spell list." />
  return spell.spell ? (
    <SpellSpotlight spell={spell.spell} />
  ) : (
    <ReferenceStatus message="Finding it…" />
  )
}

/**
 * The stage. One thing at a time, because that is what the DM's remote can
 * point at and because two things on a wall is neither of them being read.
 */
export function TableSpotlight({ spotlight, token }: { spotlight: SpotlightView; token: string }) {
  return (
    <section
      aria-label="On the table screen"
      aria-live="polite"
      className="border-primary/50 bg-card rounded-xl border-2 p-[1em]"
    >
      {spotlight.kind === 'npc' ? (
        <div className="space-y-[0.8em]">
          <div className="flex items-start gap-[0.8em]">
            <SpotlightImage
              token={token}
              uploadedAt={spotlight.imageUploadedAt}
              alt={spotlight.name}
              className="h-[4em] w-[4em] shrink-0 rounded-full border object-cover"
            />
            <SpotlightHeading kind="npc" name={spotlight.name} />
          </div>
          {spotlight.summary ? (
            <p className="text-[1.3em] leading-snug font-medium">{spotlight.summary}</p>
          ) : null}
          <Prose text={spotlight.description} />
        </div>
      ) : null}

      {spotlight.kind === 'location' ? (
        <div className="space-y-[0.8em]">
          <SpotlightHeading kind="location" name={spotlight.name} />
          {spotlight.summary ? (
            <p className="text-[1.3em] leading-snug font-medium">{spotlight.summary}</p>
          ) : null}
          <Prose text={spotlight.description} />
        </div>
      ) : null}

      {spotlight.kind === 'handout' ? (
        <div className="space-y-[0.8em]">
          <SpotlightHeading kind="handout" name={spotlight.title} />
          <SpotlightImage
            token={token}
            uploadedAt={spotlight.imageUploadedAt}
            alt={spotlight.title}
          />
          {/* A handout is a thing someone wrote, so it is set as one: serif,
              wider leading, the DM's line breaks kept. */}
          <div className="font-serif">
            <Prose text={spotlight.body} />
          </div>
        </div>
      ) : null}

      {spotlight.kind === 'character' ? (
        <SheetSpotlight sheet={spotlight.sheet} token={token} />
      ) : null}

      {spotlight.kind === 'monster' ||
      spotlight.kind === 'spell' ||
      spotlight.kind === 'condition' ? (
        <ReferenceSpotlight spotlight={spotlight} />
      ) : null}
    </section>
  )
}
