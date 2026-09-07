import { InsetGroup, InsetLinkRow } from '@/components/dm/inset-list'
import type { PlayFight } from '@/lib/db/encounters'
import { fightHasStarted, fightLine } from '@/lib/encounters/fight-status'

/**
 * The first thing on the Play tab, because it is the first thing a hand
 * reaches for (`dm-chronology/play-tab`).
 *
 * Two groups, and the split between them is the difference between a fight
 * that is happening and a fight that was prepared:
 *
 * - **The fight** — every encounter on the table, one row each, saying whose
 *   turn it is. Two open fights are two rows; the app has never stopped a DM
 *   running a chase and an ambush at once, and the tab does not pretend
 *   otherwise by picking one.
 * - **Start a fight** — what was built and has not been rolled for yet, and
 *   the door to the builder. This is the row pressed when the party walks into
 *   the room the goblins are in.
 *
 * Both are `completed_at null` rows; `fightHasStarted` is what separates them,
 * and it lives in `src/lib/encounters/fight-status.ts` because it is a
 * judgement about a fight rather than a property of a row.
 *
 * A server component: it links, and nothing on it changes anything.
 */
export function PlayFights({ campaignId, fights }: { campaignId: string; fights: PlayFight[] }) {
  const live = fights.filter((fight) => fightHasStarted(fight.encounter, fight.combatants))
  const built = fights.filter((fight) => !fightHasStarted(fight.encounter, fight.combatants))

  return (
    <>
      <InsetGroup label="The fight">
        {live.length > 0 ? (
          live.map((fight) => (
            <InsetLinkRow
              key={fight.encounter.id}
              href={`/dm/encounters/${fight.encounter.id}`}
              label={fight.encounter.name}
              hint={fightLine(fight.encounter, fight.combatants)}
              value="Open tracker"
            />
          ))
        ) : (
          <EmptyRow>
            No fight on the table. Start one below and the tracker takes over the screen.
          </EmptyRow>
        )}
      </InsetGroup>

      <InsetGroup label="Start a fight">
        {built.map((fight) => (
          <InsetLinkRow
            key={fight.encounter.id}
            href={`/dm/encounters/${fight.encounter.id}`}
            label={fight.encounter.name}
            hint={
              fight.combatants.length > 0
                ? `Built · ${fight.combatants.length} in it, no initiative yet`
                : 'Built · nobody in it yet'
            }
          />
        ))}

        {built.length === 0 ? <EmptyRow>Nothing built and waiting.</EmptyRow> : null}

        <InsetLinkRow
          href={`/dm/campaigns/${campaignId}/encounters/new`}
          label="Build an encounter"
          hint="Monsters, and what they cost the people who turn up."
        />
      </InsetGroup>
    </>
  )
}

/** A line where a row would be, inside the group rather than under it. */
function EmptyRow({ children }: { children: React.ReactNode }) {
  return <li className="text-muted-foreground px-4 py-3 text-sm">{children}</li>
}
