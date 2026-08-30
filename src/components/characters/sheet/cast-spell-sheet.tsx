'use client'

import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { castableSlotLevels, spendSlot, type CombatState } from '@/lib/characters/combat'
import { formatSpellLevel } from '@/lib/srd/format'
import { useSpell } from '@/lib/srd/hooks'
import { cn } from '@/lib/utils'

/** The spell a player has tapped "Cast" on. */
export interface CastTarget {
  index: string
  name: string
}

/**
 * The cast flow (DND-050): spend a slot *from the spell*, not from a card two
 * screens away.
 *
 * The sheet already holds every fact this needs — the spell's level, which slot
 * pools have anything left, the damage-by-slot table, whether it is a ritual —
 * and before this it made the player do that join by hand mid-turn. Here it is
 * one gesture: tap Cast, pick a level, the pip is spent.
 *
 * Shape and placement follow the DND-003 reference sheet: bottom-anchored, so
 * the level buttons and the confirm land under a thumb on a phone held
 * one-handed. It is a *layer*, not a card, which is what keeps the DND-023
 * invariant intact — the cast flow adds nothing to the scroll and does not push
 * hit points further from the top.
 *
 * Two things it deliberately does not do:
 *
 * - **No dice.** The damage for the chosen level is *displayed* ("8d6 Fire"),
 *   never rolled — physical dice are the point of a physical table (D8).
 * - **No concentration flag.** Concentration is DND-049's, and it has not
 *   landed. A concentration spell says so here, loudly enough to be useful, and
 *   this does not grow a private half-version of the tracking to be untangled
 *   later.
 */
export function CastSpellSheet({
  target,
  state,
  apply,
  onClose,
}: {
  target: CastTarget | null
  state: CombatState
  apply: (transition: (state: CombatState) => CombatState) => void
  onClose: () => void
}) {
  // Keep the last target on screen through the close animation, exactly as the
  // reference sheet does, so the body does not blank out mid-slide.
  const [rendered, setRendered] = useState<CastTarget | null>(target)
  /** The level the player picked, if they picked one — see `chosen` below. */
  const [choice, setChoice] = useState<{ index: string; level: number } | null>(null)

  if (target && target !== rendered) {
    setRendered(target)
  }

  const { spell, isLoading, error } = useSpell(rendered?.index ?? null)

  const spellLevel = spell?.level ?? null
  const isCantrip = spellLevel === 0
  const levels = spellLevel === null ? [] : castableSlotLevels(state.spellSlots, spellLevel)

  // Cast at its own level unless that pool is empty, in which case the lowest
  // slot that can carry it — the upcast a player would have reached for anyway.
  // The pick is derived rather than stored in an effect: a stale choice (a
  // different spell, or a level whose last slot went while the sheet was open)
  // simply stops matching and the default takes over, so the picker can never
  // offer to spend a slot that is not there.
  const preferred = spellLevel !== null && levels.includes(spellLevel) ? spellLevel : levels[0]
  const chosen =
    choice && choice.index === rendered?.index && levels.includes(choice.level)
      ? choice.level
      : preferred

  // The SRD prints the higher-slot damage as a table keyed by slot level; the
  // local data carries it the same way, labelled as the book labels it.
  const damage =
    chosen === undefined
      ? undefined
      : spell?.higherLevelDamage.find((row) => row.label === `Level ${chosen}`)?.damage
  const damageType = spell?.damageTypes[0]

  return (
    <Sheet
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="bottom"
        // Sized to its content rather than the reference sheet's 90dvh: this is
        // a decision taken mid-turn, and it should not bury the sheet behind it.
        className="max-h-[85dvh] gap-0 rounded-t-xl p-0 sm:mx-auto sm:max-w-lg [&>button]:top-3 [&>button]:right-3 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md"
      >
        <SheetHeader className="border-b pr-14">
          <SheetTitle className="text-lg">{rendered?.name ?? ''}</SheetTitle>
          <SheetDescription>
            {spellLevel === null ? 'Cast' : `Cast — ${formatSpellLevel(spellLevel)}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pt-4 pb-6">
          {isLoading ? (
            <p className="text-muted-foreground text-sm" role="status">
              Loading the spell…
            </p>
          ) : error || !spell ? (
            <p className="text-muted-foreground text-sm">
              Could not load this spell. Spend the slot on the spell slots card instead.
            </p>
          ) : (
            <>
              {spell.ritual || spell.concentration ? (
                <div className="flex flex-wrap gap-2">
                  {spell.ritual ? <Badge variant="secondary">Ritual</Badge> : null}
                  {spell.concentration ? <Badge variant="secondary">Concentration</Badge> : null}
                </div>
              ) : null}

              {spell.concentration ? (
                <p className="text-muted-foreground text-xs">
                  Concentration — casting this ends any other concentration spell you have going.
                </p>
              ) : null}

              {isCantrip ? (
                <p className="text-sm">
                  A cantrip costs no slot — cast it as often as you like. Nothing to spend here.
                </p>
              ) : levels.length === 0 ? (
                <p className="text-sm">
                  No slots left at {formatSpellLevel(spellLevel ?? 1).toLowerCase()} or higher.
                  {spell.ritual ? ' You can still cast it as a ritual.' : ''}
                </p>
              ) : (
                <>
                  <div>
                    <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                      Slot level
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {levels.map((level) => {
                        const slot = state.spellSlots[String(level)]
                        const active = level === chosen

                        return (
                          <Button
                            key={level}
                            type="button"
                            variant={active ? 'default' : 'outline'}
                            aria-pressed={active}
                            className="h-11 px-3"
                            onClick={() => setChoice({ index: rendered?.index ?? '', level })}
                          >
                            <span>Lvl {level}</span>
                            <span
                              className={cn(
                                'ml-1.5 text-xs tabular-nums',
                                active ? 'opacity-80' : 'text-muted-foreground',
                              )}
                            >
                              {slot.max - slot.used} left
                            </span>
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  {damage ||
                  (chosen !== undefined && spellLevel !== null && chosen > spellLevel) ? (
                    <div className="bg-muted/50 rounded-md border p-3">
                      <h3 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                        {chosen !== undefined && spellLevel !== null && chosen > spellLevel
                          ? `Upcast to level ${chosen}`
                          : `At level ${chosen}`}
                      </h3>
                      {damage ? (
                        <p className="text-base font-semibold">
                          {damage}
                          {damageType ? (
                            <span className="text-muted-foreground ml-1.5 text-sm font-normal">
                              {damageType}
                            </span>
                          ) : null}
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          No damage table — read the spell for what the higher slot buys.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {spell.higherLevel ? (
                    <div>
                      <h3 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                        Using a higher-level spell slot
                      </h3>
                      <p className="text-sm">{spell.higherLevel}</p>
                    </div>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>

        {spell && !isCantrip && (levels.length > 0 || spell.ritual) ? (
          <div className="flex flex-col gap-2 border-t px-4 py-3">
            {chosen !== undefined ? (
              <Button
                type="button"
                className="h-12 w-full text-base"
                onClick={() => {
                  apply((current) => spendSlot(current, chosen))
                  onClose()
                }}
              >
                Cast at level {chosen} — spend a slot
              </Button>
            ) : null}

            {spell.ritual ? (
              <Button type="button" variant="outline" className="h-11 w-full" onClick={onClose}>
                Cast as ritual — no slot
              </Button>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
