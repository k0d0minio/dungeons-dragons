import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatReferenceIndex } from '@/lib/characters/display'
import {
  ABILITIES,
  BACKGROUNDS,
  BACKGROUND_ABILITY_SPREADS,
  FEATS,
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
 * The 2024 build block as the row holds it
 * (`srd-2024-migration/character-model-migration`): background, what its
 * ability score increases were spent on, the Origin feat, the subclass, the
 * weapons this character has Weapon Mastery with, and the feats taken at the
 * Ability Score Improvement levels (`srd-2024-migration/asi-and-feats`).
 *
 * Read-only, and in Me rather than Play, because none of it changes during a
 * session — it is the character record, next to the abilities and saves it
 * explains. The build fields are edited on the same one-page form everything
 * else on this sheet is edited from; the feats are the level planner's.
 *
 * Every line renders whether or not it is filled in. A character copied off
 * paper before these columns existed has six empty rows, and six rows saying
 * "not recorded" is a better answer than a card that quietly shrinks to
 * whatever happens to be set — the gap is the thing worth seeing.
 */
export function OriginCard({ character }: { character: Character }) {
  const background = BACKGROUNDS.get(character.backgroundIndex ?? '')
  const originFeat = ORIGIN_FEATS.get(character.originFeatIndex ?? '')
  const subclass = SUBCLASSES.get(character.subclassIndex ?? '')

  // The level planner's ledger, read back as a line: an Ability Score
  // Improvement is a feat in the 2024 rules, so it is listed like one, with the
  // level that bought it — which is the only thing here a player has to be able
  // to count.
  const feats = (character.featChoices ?? []).map(
    (choice) =>
      `${nameOf(FEATS.get(choice.featIndex)?.name, choice.featIndex)} (level ${choice.level})`,
  )

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
        <Row label="Feats" value={feats.length > 0 ? feats.join(', ') : null} />
      </CardContent>
    </Card>
  )
}
