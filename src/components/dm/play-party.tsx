'use client'

import Link from 'next/link'
import { useState } from 'react'
import useSWR from 'swr'

import { CampaignMilestoneCard } from '@/components/campaigns/campaign-milestone-card'
import {
  INSET_ROW_CLASS,
  InsetGroup,
  InsetRowBody,
  InsetRowChevron,
} from '@/components/dm/inset-list'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { derivedArmorClass, type ArmorDetails } from '@/lib/characters/attacks'
import { formatReferenceIndex } from '@/lib/characters/display'
import { CONDITIONS, passivePerception } from '@/lib/characters/rules'
import { partyMilestoneStanding } from '@/lib/campaigns/milestone'
import type { Character } from '@/lib/db/schema'
import { fetcher } from '@/lib/srd/hooks'

/** The glance's beat (D25), and the glance's key — SWR dedupes the two. */
const REFRESH_INTERVAL_MS = 15_000

const CONDITION_LABELS = new Map(CONDITIONS.map((condition) => [condition.index, condition.label]))

function conditionLabel(index: string): string {
  return CONDITION_LABELS.get(index) ?? formatReferenceIndex(index)
}

/**
 * The party, as `PartyGlance` shows it, compacted to fit under a fight
 * (`dm-chronology/play-tab`).
 *
 * Same data, same poll, same key, same destination — this is not a second
 * glance, it is the glance's rows on a screen that has three other things on
 * it. What changes is the shape: an HP bar under the numbers rather than
 * numbers alone (a bar is read at a glance and a fraction is read), who plays
 * the character on the same line as its class (the DM's actual question is
 * "whose is this"), and conditions dropped entirely from a row that has none
 * rather than given an empty line each.
 *
 * The one control is the milestone value row under the party, which opens the
 * card that already exists in a sheet. It is a value row rather than a card
 * because at this point in the evening it is a fact — "Level 3 · 4 of 6 have
 * taken it" — and only occasionally a decision.
 */
export function PlayParty({
  campaignId,
  initialCharacters,
  initialArmor = {},
  playedBy = {},
  milestoneLevel,
}: {
  campaignId: string
  initialCharacters: Character[]
  initialArmor?: Record<string, ArmorDetails[]>
  /** Account name by `owner_id`, read once on the server — names do not change mid-fight. */
  playedBy?: Record<string, string>
  milestoneLevel: number | null
}) {
  const [milestoneOpen, setMilestoneOpen] = useState(false)

  const { data } = useSWR<{ characters: Character[]; armor?: Record<string, ArmorDetails[]> }>(
    `/api/campaigns/${campaignId}`,
    fetcher,
    {
      refreshInterval: REFRESH_INTERVAL_MS,
      fallbackData: { characters: initialCharacters, armor: initialArmor },
    },
  )

  const characters = data?.characters ?? initialCharacters
  const armor = data?.armor ?? initialArmor
  const standing = partyMilestoneStanding(characters, milestoneLevel)

  return (
    <>
      <InsetGroup label="The party">
        {characters.length > 0 ? (
          characters.map((character) => {
            const down = character.currentHitPoints === 0
            const bloodied =
              character.currentHitPoints > 0 &&
              character.currentHitPoints * 2 <= character.maxHitPoints
            const armorClass = derivedArmorClass(character, armor[character.id] ?? []).value
            const player = playedBy[character.ownerId]
            const conditions = character.conditions.map(conditionLabel)

            // Clamped: temporary hit points can push the current total past the
            // maximum, and a bar that overflows its track reads as a bug.
            const filled = Math.max(
              0,
              Math.min(
                100,
                Math.round((character.currentHitPoints / character.maxHitPoints) * 100),
              ),
            )

            return (
              <li key={character.id}>
                <Link
                  href={`/dm/campaigns/${campaignId}/party/${character.id}`}
                  className="hover:bg-accent focus-visible:ring-ring flex min-h-14 flex-col gap-1.5 px-4 py-3 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{character.name}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        Level {character.level} {formatReferenceIndex(character.classIndex)}
                        {player ? ` · ${player}` : ''}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-3 text-sm tabular-nums">
                      <span
                        className={
                          down
                            ? 'text-destructive font-semibold'
                            : bloodied
                              ? 'font-semibold text-hp-bloodied'
                              : 'font-semibold'
                        }
                      >
                        {character.currentHitPoints}/{character.maxHitPoints}
                        {character.temporaryHitPoints > 0 ? (
                          <span className="ml-1 text-xs text-hp-temp">
                            +{character.temporaryHitPoints}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        AC {armorClass} · PP{' '}
                        {passivePerception(character, character.classIndex, character)}
                      </span>
                    </span>
                  </span>

                  {/* The bar is decoration over numbers that are already on the
                    row, so it is hidden from a screen reader rather than read
                    out as a second, wordless copy of the hit points. */}
                  <span aria-hidden className="bg-muted block h-1.5 overflow-hidden rounded-full">
                    <span
                      className={`block h-full rounded-full ${
                        down ? 'bg-destructive' : bloodied ? 'bg-hp-bloodied' : 'bg-primary'
                      }`}
                      style={{ width: `${filled}%` }}
                    />
                  </span>

                  {/* Only when there is something to say — an empty conditions
                    line on six rows is a screenful of nothing. */}
                  {character.concentration || conditions.length > 0 || character.exhaustion > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {character.concentration ? (
                        <Badge className="text-xs">
                          Concentrating: {character.concentration.name}
                        </Badge>
                      ) : null}
                      {conditions.map((condition) => (
                        <Badge key={condition} variant="secondary" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                      {character.exhaustion > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          Exhaustion {character.exhaustion}
                        </Badge>
                      ) : null}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })
        ) : (
          <li className="text-muted-foreground px-4 py-3 text-sm">
            Nobody has joined yet. Send the join link to your players.
          </li>
        )}

        {/* The one control in the group, and a row like the rest of them: at
            this point in the evening the milestone is a fact to read, and only
            occasionally a decision to make. */}
        <li>
          <button
            type="button"
            className={`${INSET_ROW_CLASS} hover:bg-accent`}
            onClick={() => setMilestoneOpen(true)}
          >
            <InsetRowBody
              label="Milestone"
              value={
                milestoneLevel === null
                  ? 'Not called'
                  : `Level ${milestoneLevel} · ${standing.levelled} of ${standing.party} have taken it`
              }
            />
            <InsetRowChevron />
          </button>
        </li>
      </InsetGroup>

      <Sheet open={milestoneOpen} onOpenChange={setMilestoneOpen}>
        <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Levelling up</SheetTitle>
            <SheetDescription>
              Say the level out loud and every sheet asks its player to take it. Nothing here
              changes a character.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <CampaignMilestoneCard
              campaignId={campaignId}
              milestoneLevel={milestoneLevel}
              initialCharacters={characters}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
