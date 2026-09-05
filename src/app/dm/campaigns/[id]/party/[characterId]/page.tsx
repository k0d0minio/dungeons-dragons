import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DmNoteCard } from '@/components/campaigns/dm-note-card'
import { InspirationGrant } from '@/components/campaigns/inspiration-grant'
import { ReadinessCard } from '@/components/campaigns/readiness-card'
import { RetireCharacterCard } from '@/components/campaigns/retire-character-card'
import { PageHeader } from '@/components/navigation/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { derivedArmorClass, spellSaveDc, weaponAttack } from '@/lib/characters/attacks'
import { formatModifier, formatReferenceIndex } from '@/lib/characters/display'
import { characterReadiness } from '@/lib/characters/readiness'
import {
  effectiveSpeed,
  initiativeModifier,
  passivePerception,
  skillChecks,
} from '@/lib/characters/rules'
import { gatesForCharacter, getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { getCharacterDmNote } from '@/lib/db/dm-notes'
import { listItems } from '@/lib/db/items'
import { getUserName } from '@/lib/db/users'
import { CLASSES } from '@/lib/srd/classes'
import { SPECIES } from '@/lib/srd/species'
import { WEAPONS } from '@/lib/srd/weapons'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Character',
}

/** One labelled line of the DM's small screen. */
function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

/**
 * The DM's page for one player character (`first-table/dm-character-profile`).
 *
 * The Lazy DM's step zero — review the characters — and the research's "small
 * DM screen": who plays them, whether they are ready for the night, the
 * numbers the DM reads mid-fight, the Inspiration hand-over, and the DM's
 * private note. The live sheet is one tap further (D13).
 *
 * **Scoped by the same two arms `getCampaignRoster` uses**: the campaign is
 * this DM's (`campaigns.dm_user_id`) and the character is on its roster.
 * Anything else — another DM's table, a character that plays elsewhere, an id
 * that never was — is the same 404. Nothing on this page is selected by a
 * player-facing query, and the note in particular has no route the owner can
 * reach (D38).
 *
 * Every number here is the sheet's own: `derivedArmorClass` over the roster's
 * worn armour, `weaponAttack` over the readied rows, `passivePerception` with
 * the stored proficiencies — read-only, and never a second formula.
 */
export default async function DmCharacterPage({
  params,
}: {
  params: Promise<{ id: string; characterId: string }>
}) {
  const user = await requireSessionUser()
  const { id, characterId } = await params

  if (!isDatabaseConfigured()) notFound()

  const roster = await getCampaignRoster(user.id, id)
  if (!roster) notFound()

  const character = roster.characters.find((entry) => entry.id === characterId)
  if (!character) notFound()

  const [items, playedBy, note, gates] = await Promise.all([
    listItems(user.id, characterId),
    getUserName(character.ownerId),
    getCharacterDmNote(user.id, id, characterId),
    gatesForCharacter(user.id, characterId),
  ])

  const inventory = items ?? []
  const readiness = characterReadiness(character, inventory)
  const armorClass = derivedArmorClass(character, roster.armor[character.id] ?? [])
  const speciesName =
    SPECIES.get(character.speciesIndex)?.name ?? formatReferenceIndex(character.speciesIndex)
  const className =
    CLASSES.get(character.classIndex)?.name ?? formatReferenceIndex(character.classIndex)

  const attacks = inventory
    .filter((item) => item.equipped && item.equipmentIndex !== null)
    .flatMap((item) => {
      const weapon = WEAPONS.get(item.equipmentIndex as string)
      if (!weapon) return []
      const attack = weaponAttack(character, weapon, item.customName ?? undefined)
      return [`${attack.name} ${formatModifier(attack.attackBonus)}, ${attack.damage ?? '—'}`]
    })

  const slots = Object.entries(character.spellSlots)
    .filter(([, pool]) => pool.max > 0)
    .map(([level, pool]) => `${pool.max - pool.used}/${pool.max} at ${level}`)
  const saveDc = spellSaveDc(character)
  const trained = skillChecks(character, character.classIndex, character)
    .filter((skill) => skill.proficient)
    .map((skill) => (skill.expertise ? `${skill.label} (expertise)` : skill.label))

  const backgroundName = character.backgroundIndex
    ? formatReferenceIndex(character.backgroundIndex)
    : null

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-16">
      <PageHeader
        title={character.name}
        subtitle={`Played by ${playedBy ?? 'an account no longer here'} · Level ${character.level} ${speciesName} ${className}${backgroundName ? ` · ${backgroundName}` : ''}`}
        backHref={`/dm/campaigns/${roster.campaign.id}`}
        backLabel={roster.campaign.name}
        actions={
          <>
            <Button asChild className="h-11">
              <Link href={`/characters/${character.id}?campaign=${roster.campaign.id}`}>
                Open sheet
              </Link>
            </Button>
            <Link
              href={`/characters/${character.id}/edit`}
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            >
              Edit
            </Link>
            <Link
              href={`/characters/${character.id}/level`}
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            >
              Manage level
            </Link>
          </>
        }
      />

      <ReadinessCard
        character={{ id: character.id, version: character.version }}
        items={inventory}
        readiness={readiness}
        masteryShown={gates.weaponMastery}
      />

      {/* The small DM screen: what the DM reads to decide whether a goblin
          hits, what a check needs, and what this character can do back. All
          of it the sheet's own arithmetic. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">As the sheet computes it</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Line
            label="Hit points"
            value={`${character.currentHitPoints}/${character.maxHitPoints}${
              character.temporaryHitPoints > 0 ? ` +${character.temporaryHitPoints} temp` : ''
            }`}
          />
          <Line
            label="Armour class"
            value={`${armorClass.value}${armorClass.source === 'equipment' ? (armorClass.shield ? ' (gear + shield)' : ' (from gear)') : ' (unarmoured)'}`}
          />
          <Line
            label="Passive Perception"
            value={String(passivePerception(character, character.classIndex, character))}
          />
          <Line
            label="Initiative"
            value={formatModifier(initiativeModifier(character, character.exhaustion))}
          />
          <Line
            label="Speed"
            value={`${effectiveSpeed(character.speed, character.exhaustion)} ft`}
          />
          <Line label="Attacks" value={attacks.length > 0 ? attacks.join(' · ') : 'none readied'} />
          {saveDc !== null ? <Line label="Spell save DC" value={String(saveDc)} /> : null}
          {character.knownSpellIndexes.length > 0 ? (
            <Line
              label="Spells"
              value={`${character.preparedSpellIndexes.length} prepared${
                slots.length > 0 ? ` · slots ${slots.join(', ')}` : ' · no slots'
              }`}
            />
          ) : null}
          <Line label="Trained skills" value={trained.length > 0 ? trained.join(', ') : 'none'} />
        </CardContent>
      </Card>

      <InspirationGrant
        characterId={character.id}
        characterName={character.name}
        version={character.version}
        held={character.heroicInspiration === true}
      />

      <DmNoteCard
        campaignId={roster.campaign.id}
        characterId={character.id}
        characterName={character.name}
        note={note}
      />

      <RetireCharacterCard
        campaignId={roster.campaign.id}
        characterId={character.id}
        characterName={character.name}
        playedBy={playedBy}
      />
    </main>
  )
}
