// The read-only half of the sheet (DND-009): everything here is derived from
// the stored row at render time, so it cannot disagree with it.
import { GlossaryTerm } from '@/components/glossary/glossary-term'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { derivedArmorClass, type ArmorDetails } from '@/lib/characters/attacks'
import { abilityModifier, formatModifier } from '@/lib/characters/display'
import {
  ABILITIES,
  clampCharacterLevel,
  effectiveSpeed,
  exhaustionD20Penalty,
  initiativeModifier,
  proficiencyBonus,
  savingThrows,
  skillChecks,
  type AbilityScores,
} from '@/lib/characters/rules'
import type { Character } from '@/lib/db/characters'

/** The six scores off a stored row, in the shape the rules functions want. */
export function abilityScoresOf(character: Character): AbilityScores {
  return {
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
  }
}

/**
 * One glanceable number. The abbreviation is what the eye wants and the
 * `aria-label` is what a screen reader needs — "AC 12", not "A C. 12".
 *
 * The abbreviation is also where the sheet answers "what even is this"
 * (`learn-to-play/glossary-popovers`): given a `term`, the four letters become
 * the tappable thing, since "AC" is exactly the label a first-time player has
 * no way to decode from the sheet alone. The trigger carries its own
 * accessible name, so it is not `aria-hidden` the way the plain label is.
 */
function Tile({
  label,
  value,
  srLabel,
  caption,
  term,
}: {
  /** The abbreviation the eye reads. */
  label: string
  value: string | number
  /** The whole thing spelled out, for a screen reader. */
  srLabel: string
  /** One quiet word under the number — where it came from. */
  caption?: string
  /** Glossary index the abbreviation opens, when there is one for it. */
  term?: string
}) {
  const labelClass = 'text-muted-foreground text-xs font-medium tracking-wide uppercase'

  return (
    <div className="bg-muted/50 flex flex-col items-center rounded-lg p-2" aria-label={srLabel}>
      {term ? (
        <GlossaryTerm index={term} className={labelClass}>
          {label}
        </GlossaryTerm>
      ) : (
        <span className={labelClass} aria-hidden>
          {label}
        </span>
      )}
      <span className="text-xl font-bold tabular-nums" aria-hidden>
        {value}
      </span>
      {caption ? (
        <span className="text-muted-foreground text-[10px] leading-tight" aria-hidden>
          {caption}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Armour class, initiative and speed — checked constantly, never edited here.
 *
 * AC is derived from equipped armour when there is any (DND-035): body armour
 * sets the base, Dex applies per its category, a shield adds two. With nothing
 * equipped the stored column stands exactly as before — equipping armour is
 * what opts a character into derivation, and the caption under the number says
 * which mode it is in.
 *
 * Initiative and Speed both carry Exhaustion: 2024 Exhaustion is −2 to every
 * D20 Test and −5 ft of Speed per level, so an exhausted character's tiles show
 * what they can actually roll and move, with the caption saying why the number
 * is not the one on the row.
 */
export function VitalsCard({
  character,
  equippedArmor = [],
}: {
  character: Character
  /** Reference details of every equipped armour-category item. */
  equippedArmor?: ArmorDetails[]
}) {
  const scores = abilityScoresOf(character)
  const initiative = formatModifier(initiativeModifier(scores, character.exhaustion))
  const bonus = formatModifier(proficiencyBonus(character.level))
  const armorClass = derivedArmorClass(character, equippedArmor)
  const speed = effectiveSpeed(character.speed, character.exhaustion)
  const exhausted = character.exhaustion > 0

  const acCaption =
    armorClass.source === 'equipment'
      ? armorClass.shield
        ? 'gear + shield'
        : 'from gear'
      : 'manual'

  return (
    <Card>
      <CardContent className="grid grid-cols-4 gap-2 pt-6">
        <Tile
          label="AC"
          value={armorClass.value}
          srLabel={`Armour class ${armorClass.value}, ${
            armorClass.source === 'equipment' ? 'from equipment' : 'set by hand'
          }`}
          caption={acCaption}
          term="armour-class"
        />
        <Tile
          label="Init"
          value={initiative}
          srLabel={`Initiative ${initiative}`}
          caption={exhausted ? 'exhausted' : undefined}
          term="initiative"
        />
        {/* The unit lives in the label: four tiles across a phone have room for
            a number, not for "30 ft.". */}
        <Tile
          label="Speed"
          value={speed}
          srLabel={`Speed ${speed} feet`}
          caption={exhausted ? 'exhausted' : undefined}
          term="speed"
        />
        <Tile
          label="Prof"
          value={bonus}
          srLabel={`Proficiency bonus ${bonus}`}
          term="proficiency-bonus"
        />
      </CardContent>
    </Card>
  )
}

/** The six ability scores with their modifiers, biggest number first. */
export function AbilitiesCard({ character }: { character: Character }) {
  const scores = abilityScoresOf(character)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          <GlossaryTerm index="ability-score">Ability scores</GlossaryTerm>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2">
        {ABILITIES.map((ability) => (
          <div
            key={ability.key}
            className="bg-muted/50 flex flex-col items-center rounded-lg py-2"
            aria-label={`${ability.label} ${scores[ability.key]}`}
          >
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {ability.abbreviation}
            </span>
            <span className="text-2xl font-bold tabular-nums">
              {formatModifier(abilityModifier(scores[ability.key]))}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {scores[ability.key]}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * Saving throws, with the class's two proficiencies folded in.
 *
 * These are the one set of proficiencies 5e fixes rather than lets a player
 * choose, which is what makes them derivable from a row that stores a class and
 * a level and nothing else — plus Exhaustion, which is a row too, and which
 * takes 2 off every save per level in the 2024 rules.
 */
export function SavingThrowsCard({ character }: { character: Character }) {
  const saves = savingThrows(
    abilityScoresOf(character),
    character.classIndex,
    character.level,
    character.exhaustion,
  )
  const exhaustionPenalty = exhaustionD20Penalty(character.exhaustion)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          <GlossaryTerm index="saving-throw">Saving throws</GlossaryTerm>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {exhaustionPenalty !== 0 ? (
          <p className="text-muted-foreground text-xs">
            Exhaustion −{Math.abs(exhaustionPenalty)} is already in these numbers.
          </p>
        ) : null}
        <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
          {saves.map((save) => (
            <li
              key={save.ability}
              className="flex min-h-9 items-center justify-between gap-2 border-b py-1"
              // The filled dot means "proficient"; say so rather than leave it
              // to a screen reader to guess at a decoration.
              aria-label={`${save.label} saving throw ${formatModifier(save.modifier)}${
                save.proficient ? ', proficient' : ''
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm" aria-hidden>
                <span
                  className={
                    save.proficient
                      ? 'bg-primary size-2 rounded-full'
                      : 'border-muted-foreground/40 size-2 rounded-full border'
                  }
                />
                {save.label}
              </span>
              <span className="text-sm font-semibold tabular-nums" aria-hidden>
                {formatModifier(save.modifier)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/**
 * The eighteen skills at their full check bonus (DND-015, D21): ability
 * modifier plus proficiency, doubled for expertise, half for a bard's Jack of
 * All Trades — all read off the stored picks, so the number on screen is the
 * number to roll, no mental arithmetic left.
 *
 * The filled dot marks proficiency the same way the saving throws card does;
 * expertise gets a badge on top. The old "Class skill" badges are gone — they
 * marked what the class *could* have picked and read as proficiency markers.
 *
 * A `Character` row is a valid `SkillSelections`, `exhaustion` column included,
 * so the 2024 −2 per level lands on every one of these bonuses without this
 * card having to know the rule.
 */
export function SkillsCard({ character }: { character: Character }) {
  const skills = skillChecks(abilityScoresOf(character), character.classIndex, character)
  const exhaustionPenalty = exhaustionD20Penalty(character.exhaustion)

  const jackOfAllTrades =
    character.classIndex === 'bard' && clampCharacterLevel(character.level) >= 2
  const halfBonus = Math.floor(proficiencyBonus(character.level) / 2)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          <GlossaryTerm index="skill">Skills</GlossaryTerm>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul>
          {skills.map((skill) => (
            <li
              key={skill.index}
              className="flex min-h-9 items-center justify-between gap-2 border-b py-1 text-sm last:border-b-0"
              aria-label={`${skill.label} ${formatModifier(skill.modifier)}${
                skill.expertise ? ', expertise' : skill.proficient ? ', proficient' : ''
              }`}
            >
              <span className="flex items-center gap-2" aria-hidden>
                <span
                  className={
                    skill.proficient
                      ? 'bg-primary size-2 shrink-0 rounded-full'
                      : 'border-muted-foreground/40 size-2 shrink-0 rounded-full border'
                  }
                />
                {skill.label}
                {skill.expertise ? (
                  <Badge variant="secondary" className="text-xs">
                    Expertise
                  </Badge>
                ) : null}
              </span>
              <span className="flex items-center gap-2" aria-hidden>
                <span className="text-muted-foreground text-xs tracking-wide uppercase">
                  {skill.ability.slice(0, 3)}
                </span>
                <span className="w-8 text-right font-semibold tabular-nums">
                  {formatModifier(skill.modifier)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        {jackOfAllTrades ? (
          <p className="text-muted-foreground text-xs">
            Jack of All Trades: +{halfBonus} is already included in every check you are not
            proficient in.
          </p>
        ) : null}
        {exhaustionPenalty !== 0 ? (
          <p className="text-muted-foreground text-xs">
            Exhaustion −{Math.abs(exhaustionPenalty)} is already in these numbers.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
