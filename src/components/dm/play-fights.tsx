import { DisclosureRow, ListNote, Section } from '@/components/dm/inset-list'
import { fightHasStarted, fightLine } from '@/lib/encounters/fight-status'
import type { PlayFight } from '@/lib/db/encounters'

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
 * A server component: it links, and nothing on it changes anything.
 */
export function PlayFights({ campaignId, fights }: { campaignId: string; fights: PlayFight[] }) {
  const live = fights.filter((fight) => fightHasStarted(fight.encounter, fight.combatants))
  const built = fights.filter((fight) => !fightHasStarted(fight.encounter, fight.combatants))

  return (
    <>
      <Section title="The fight">
        {live.length > 0 ? (
          live.map((fight) => (
            <DisclosureRow
              key={fight.encounter.id}
              href={`/dm/encounters/${fight.encounter.id}`}
              label={fight.encounter.name}
              detail={fightLine(fight.encounter, fight.combatants)}
              trailing="Open tracker"
            />
          ))
        ) : (
          <ListNote>
            No fight on the table. Start one below and the tracker takes over the screen.
          </ListNote>
        )}
      </Section>

      <Section title="Start a fight">
        {built.map((fight) => (
          <DisclosureRow
            key={fight.encounter.id}
            href={`/dm/encounters/${fight.encounter.id}`}
            label={fight.encounter.name}
            detail={
              fight.combatants.length > 0
                ? `Built · ${fight.combatants.length} in it, no initiative yet`
                : 'Built · nobody in it yet'
            }
          />
        ))}

        {built.length === 0 ? <ListNote>Nothing built and waiting.</ListNote> : null}

        <DisclosureRow
          href={`/dm/campaigns/${campaignId}/encounters/new`}
          label="Build an encounter"
          detail="Monsters, and what they cost the people who turn up."
        />
      </Section>
    </>
  )
}
