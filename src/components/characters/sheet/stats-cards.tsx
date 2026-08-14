// The read-only half of the sheet (DND-009): everything here is derived from
// the stored row at render time, so it cannot disagree with it.
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { abilityModifier, formatModifier } from '@/lib/characters/display'
import {
  ABILITIES,
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
 */
function Tile({
  label,
  value,
  srLabel,
}: {
  /** The abbreviation the eye reads. */
  label: string
  value: string | number
  /** The whole thing spelled out, for a screen reader. */
  srLabel: string
}) {
  return (
    <div className="bg-muted/50 flex flex-col items-center rounded-lg p-2" aria-label={srLabel}>
      <span
        className="text-muted-foreground text-[0.65rem] font-medium tracking-wide uppercase"
        aria-hidden
      >
        {label}
      </span>
      <span className="text-xl font-bold tabular-nums" aria-hidden>
        {value}
      </span>
    </div>
  )
}

/** Armour class, initiative and speed — checked constantly, never edited here. */
export function VitalsCard({ character }: { character: Character }) {
  const scores = abilityScoresOf(character)
  const initiative = formatModifier(initiativeModifier(scores))
  const bonus = formatModifier(proficiencyBonus(character.level))

  return (
    <Card>
      <CardContent className="grid grid-cols-4 gap-2 pt-6">
        <Tile label="AC" value={character.armorClass} srLabel={`Armour class ${character.armorClass}`} />
        <Tile label="Init" value={initiative} srLabel={`Initiative ${initiative}`} />
        {/* The unit lives in the label: four tiles across a phone have room for
            a number, not for "30 ft.". */}
        <Tile label="Speed" value={character.speed} srLabel={`Speed ${character.speed} feet`} />
        <Tile label="Prof" value={bonus} srLabel={`Proficiency bonus ${bonus}`} />
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
        <CardTitle className="text-base">Ability scores</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2">
        {ABILITIES.map((ability) => (
          <div
            key={ability.key}
            className="bg-muted/50 flex flex-col items-center rounded-lg py-2"
            aria-label={`${ability.label} ${scores[ability.key]}`}
          >
            <span className="text-muted-foreground text-[0.65rem] font-medium tracking-wide uppercase">
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
 * a level and nothing else.
 */
export function SavingThrowsCard({ character }: { character: Character }) {
  const saves = savingThrows(abilityScoresOf(character), character.classIndex, character.level)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Saving throws</CardTitle>
      </CardHeader>
      <CardContent>
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
 * The eighteen skills with the ability modifier each one uses.
 *
 * Proficiency is deliberately *not* added. In 5e a character picks two skills
 * (four for a rogue) from their class's list, and nothing in the `characters`
 * row records which — so the honest sheet shows the ability modifier and marks
 * which rows the class could have taken. Making those picks storable is
 * DND-015; until then a +3 the sheet invented would be worse than a number the
 * player knows to adjust.
 */
export function SkillsCard({ character }: { character: Character }) {
  const skills = skillChecks(abilityScoresOf(character), character.classIndex)
  const bonus = proficiencyBonus(character.level)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Skills</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul>
          {skills.map((skill) => (
            <li
              key={skill.index}
              className="flex min-h-9 items-center justify-between gap-2 border-b py-1 text-sm last:border-b-0"
              aria-label={`${skill.label} ${formatModifier(skill.modifier)}${
                skill.classSkill ? ', a class skill' : ''
              }`}
            >
              <span className="flex items-center gap-2" aria-hidden>
                {skill.label}
                {skill.classSkill ? (
                  <Badge variant="outline" className="text-[0.65rem]">
                    Class skill
                  </Badge>
                ) : null}
              </span>
              <span className="flex items-center gap-2" aria-hidden>
                <span className="text-muted-foreground text-[0.65rem] tracking-wide uppercase">
                  {skill.ability.slice(0, 3)}
                </span>
                <span className="w-8 text-right font-semibold tabular-nums">
                  {formatModifier(skill.modifier)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">
          Ability modifier only. Add your proficiency bonus of {formatModifier(bonus)} to the two
          (or more) skills you chose at character creation — which ones you picked is not stored yet
          (DND-015).
        </p>
      </CardContent>
    </Card>
  )
}
