'use client'

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
        <CardTitle className="text-base">{HEROIC_INSPIRATION.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">{HEROIC_INSPIRATION.summary}</p>
        <Button
          type="button"
          variant={held ? 'default' : 'outline'}
          className="h-11 w-full"
          aria-pressed={held}
          onClick={() => apply((current) => setHeroicInspiration(current, !held))}
        >
          {held ? 'Spend it' : 'You have it'}
        </Button>
      </CardContent>
    </Card>
  )
}
