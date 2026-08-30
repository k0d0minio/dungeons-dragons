'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ABILITIES, CLASS_SKILL_OPTIONS, classSkillChoices, SKILLS } from '@/lib/characters/rules'

/** The classes whose feature grants expertise (D21). */
const EXPERTISE_CLASSES = new Set(['rogue', 'bard'])

/**
 * How many skills the class says to choose, or `null` for a class the SRD data
 * does not describe.
 *
 * Local rather than a `/classes/{index}` round trip, and that is a correctness
 * fix as much as a speed one: the options beside it come from SRD 5.2.1, and a
 * 2024 option list under a 2014 count is the drift this migration exists to
 * remove.
 */
function skillChoiceCount(classIndex: string): number | null {
  const choices = classSkillChoices(classIndex)
  if (choices.length === 0) return null

  return choices.reduce((total, choice) => total + choice.choose, 0)
}

/**
 * Chosen skill proficiencies, and expertise where the class has it (DND-015,
 * D21).
 *
 * All eighteen skills are offered, grouped by ability, with the class's own
 * options marked — the SRD's count is guidance, not a gate: a background and a
 * DM's ruling both add skills the class list does not, so the form advises
 * "Choose 2 — Fighter" and blocks nothing. (Species no longer do: in the 2024
 * rules they grant traits and nothing else.)
 *
 * Expertise is a per-skill toggle that only appears on a chosen skill, and
 * only for a rogue or bard; unticking a proficiency removes its expertise with
 * it, so expertise ⊆ proficiencies holds by construction.
 */
export function SkillProficiencyPicker({
  classIndex,
  classLabel,
  proficiencies,
  expertise,
  onChange,
}: {
  /** dnd5eapi class index, or `''` when the player has not picked one yet. */
  classIndex: string
  classLabel?: string
  proficiencies: string[]
  expertise: string[]
  onChange: (next: { proficiencies: string[]; expertise: string[] }) => void
}) {
  const classOptions = new Set(CLASS_SKILL_OPTIONS[classIndex] ?? [])
  const chosen = new Set(proficiencies)
  const doubled = new Set(expertise)
  const expertiseAllowed = EXPERTISE_CLASSES.has(classIndex)

  const chooseCount = skillChoiceCount(classIndex)

  function toggleProficiency(index: string) {
    if (chosen.has(index)) {
      onChange({
        proficiencies: proficiencies.filter((skill) => skill !== index),
        // Expertise cannot outlive the proficiency it doubles.
        expertise: expertise.filter((skill) => skill !== index),
      })
    } else {
      onChange({ proficiencies: [...proficiencies, index], expertise })
    }
  }

  function toggleExpertise(index: string) {
    onChange({
      proficiencies,
      expertise: doubled.has(index)
        ? expertise.filter((skill) => skill !== index)
        : [...expertise, index],
    })
  }

  if (!classIndex) {
    return (
      <p className="text-muted-foreground text-sm">
        Pick a class first — it says which skills are yours to choose.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {proficiencies.length} chosen
        {chooseCount !== null && classLabel ? (
          <span>
            {' '}
            · Choose {chooseCount} — {classLabel}. Backgrounds can add more.
          </span>
        ) : null}
      </p>

      <div className="space-y-3">
        {ABILITIES.map((ability) => {
          const skills = SKILLS.filter((skill) => skill.ability === ability.key)
          if (skills.length === 0) return null

          return (
            <section key={ability.key}>
              <h4 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                {ability.label}
              </h4>
              <ul>
                {skills.map((skill) => {
                  const id = `skill-proficiency-${skill.index}`
                  const picked = chosen.has(skill.index)

                  return (
                    <li key={skill.index} className="flex min-h-11 items-center gap-3 px-1">
                      <Checkbox
                        id={id}
                        className="size-5"
                        checked={picked}
                        onCheckedChange={() => toggleProficiency(skill.index)}
                      />
                      <Label
                        htmlFor={id}
                        className="min-h-11 flex-1 items-center text-sm font-normal"
                      >
                        <span>
                          {skill.label}
                          {classOptions.has(skill.index) ? (
                            <span className="text-muted-foreground text-xs"> · class option</span>
                          ) : null}
                        </span>
                      </Label>
                      {picked && expertiseAllowed ? (
                        <Button
                          type="button"
                          variant={doubled.has(skill.index) ? 'default' : 'outline'}
                          className="h-11 px-3 text-xs"
                          aria-pressed={doubled.has(skill.index)}
                          aria-label={`Expertise in ${skill.label}`}
                          onClick={() => toggleExpertise(skill.index)}
                        >
                          Expertise
                        </Button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
