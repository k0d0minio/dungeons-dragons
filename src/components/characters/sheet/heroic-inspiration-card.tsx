'use client'

import { GlossaryTerm } from '@/components/glossary/glossary-term'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { setHeroicInspiration, type CombatState } from '@/lib/characters/combat'
import { HEROIC_INSPIRATION } from '@/lib/characters/rules'

/**
 * Heroic Inspiration — held or spent
 * (`srd-2024-migration/character-model-migration`).
 *
 * One button, because the rule is one bit: 2024 replaced 2014's Inspiration
 * with something you either have or do not, and holding two is not a state that
 * exists. So this is not a stepper and never shows a count — the same reason
 * `HEROIC_INSPIRATION.max` is stated as 1 rather than left implied.
 *
 * It sits in Play rather than in Me because it is spent mid-roll: the DM hands
 * it over, and the next bad d20 is when the player reaches for it. The summary
 * line is the SRD's own wording, kept visible rather than tucked behind a
 * tooltip — it is the one thing at the table people forget they may do
 * *after* seeing the roll.
 */
export function HeroicInspirationCard({
  state,
  apply,
}: {
  state: CombatState
  apply: (transition: (state: CombatState) => CombatState) => void
}) {
  const held = state.heroicInspiration

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <GlossaryTerm index="heroic-inspiration">{HEROIC_INSPIRATION.label}</GlossaryTerm>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* One line in the app's own words first
            (`first-table/heroic-inspiration-line`): the SRD's summary says
            what to do with it and nothing about what it is or where it comes
            from, and the idle button used to read as a statement of fact. */}
        <p className="text-sm">
          Your DM hands this out for a good idea or a great moment. Hold one at a time; spend it to
          reroll any die.
        </p>
        <p className="text-muted-foreground text-sm">{HEROIC_INSPIRATION.summary}</p>
        <Button
          type="button"
          variant={held ? 'default' : 'outline'}
          className="h-11 w-full"
          aria-pressed={held}
          onClick={() => apply((current) => setHeroicInspiration(current, !held))}
        >
          {held ? 'Spend it' : 'Mark it received'}
        </Button>
      </CardContent>
    </Card>
  )
}
