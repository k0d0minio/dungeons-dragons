import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatReferenceIndex } from '@/lib/characters/display'
import {
  ABILITIES,
  BACKGROUNDS,
  BACKGROUND_ABILITY_SPREADS,
  ORIGIN_FEATS,
  SUBCLASSES,
  WEAPONS,
  weaponMastery,
} from '@/lib/characters/rules'
import type { Character } from '@/lib/db/characters'

/** The SRD's name for an index, falling back to the index made readable. */
function nameOf(name: string | undefined, index: string): string {
  return name ?? formatReferenceIndex(index)
}

/**
 * How the background's increases were spent, as one line: `+2 Strength, +1
 * Constitution`.
 *
 * `null` when the row does not hold a complete answer — an unset spread, or a
 * background whose abilities were never chosen. A partial line here would read
 * as a rule about the character rather than as a gap in what we were told.
 */
function abilityIncreaseLine(character: Character): string | null {
  const spread = BACKGROUND_ABILITY_SPREADS.find(
    (option) => option.key === character.backgroundAbilitySpread,
  )
  const abilities = character.backgroundAbilities

  if (!spread || !abilities || abilities.length !== spread.increases.length) return null

  return abilities
    .map((key, position) => {
      const label = ABILITIES.find((ability) => ability.key === key)?.label ?? key
      return `+${spread.increases[position]} ${label}`
    })
    .join(', ')
}

/** One labelled line, or a quiet "Not recorded" where the row holds nothing. */
function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground text-sm">{label}</span>
      {value ? (
        <span className="text-right text-sm font-medium">{value}</span>
      ) : (
        <span className="text-muted-foreground/70 text-right text-sm">Not recorded</span>
      )}
    </div>
  )
}

/**
 * The 2024 origin block as the row holds it
 * (`srd-2024-migration/character-model-migration`): background, what its
 * ability score increases were spent on, the Origin feat, the subclass, and the
 * weapons this character has Weapon Mastery with.
 *
 * Read-only, and in Me rather than Play, because none of it changes during a
 * session — it is the character record, next to the abilities and saves it
 * explains. Editing all five is the same one-page form everything else on this
 * sheet is edited from.
 *
 * Every line renders whether or not it is filled in. A character copied off
 * paper before these columns existed has five empty rows, and five rows saying
 * "not recorded" is a better answer than a card that quietly shrinks to
 * whatever happens to be set — the gap is the thing worth seeing.
 */
export function OriginCard({ character }: { character: Character }) {
  const background = BACKGROUNDS.get(character.backgroundIndex ?? '')
  const originFeat = ORIGIN_FEATS.get(character.originFeatIndex ?? '')
  const subclass = SUBCLASSES.get(character.subclassIndex ?? '')

  const mastered = (character.masteredWeaponIndexes ?? []).map((index) => {
    const mastery = weaponMastery(index)
    const weapon = nameOf(WEAPONS.get(index)?.name, index)
    return mastery ? `${weapon} (${mastery.name})` : weapon
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Origin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Row
          label="Background"
          value={
            character.backgroundIndex ? nameOf(background?.name, character.backgroundIndex) : null
          }
        />
        <Row label="Ability increases" value={abilityIncreaseLine(character)} />
        <Row
          label="Origin feat"
          value={
            character.originFeatIndex ? nameOf(originFeat?.name, character.originFeatIndex) : null
          }
        />
        <Row
          label="Subclass"
          value={character.subclassIndex ? nameOf(subclass?.name, character.subclassIndex) : null}
        />
        <Row label="Weapon mastery" value={mastered.length > 0 ? mastered.join(', ') : null} />
      </CardContent>
    </Card>
  )
}
