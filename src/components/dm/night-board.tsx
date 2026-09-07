import { InsetGroup, InsetLinkRow, InsetStaticRow } from '@/components/dm/inset-list'
import { NightNotes, RecapNote } from '@/components/dm/night-notes'
import { sessionLogLabel, formatLogTime } from '@/lib/campaigns/session-log'
import type { SessionNight } from '@/lib/db/session-log'
import type { PlanTally } from '@/lib/db/session-plans'
import { planRanLine } from '@/lib/sessions/timeline'

// One night, read top to bottom (`dm-chronology/sessions-tab`).
//
// Four sections in the order the evening produced them: **the recap** the
// party is reading, **what happened** while it ran, **your notes** from that
// evening, and **the plan** it ran from. It is the chain `session-chain` made
// out of one nullable column, drawn as a page — a DM opening a night from the
// timeline gets the whole of it rather than three screens that each know a
// third of it.
//
// Shared by two routes on purpose. A played night renders this and stops; the
// session-log page renders this for the window still open and adds the close
// step under it, which is the one thing tonight has that history does not.
// One component, so tonight and last Thursday cannot drift into looking like
// different kinds of thing.

/** What happened, oldest first — a log reads forwards. */
function WhatHappened({ night }: { night: SessionNight }) {
  return (
    <InsetGroup
      label="What happened"
      footer={
        night.entries.length > 0
          ? undefined
          : 'Ending a fight, revealing an NPC, a place or a handout, and ticking a scene or a secret off the plan all land here on their own.'
      }
    >
      {night.entries.length > 0 ? (
        night.entries.map((entry) => (
          <InsetStaticRow
            key={`${entry.kind}-${entry.id}`}
            label={entry.title}
            hint={`${formatLogTime(entry.at)} · ${sessionLogLabel(entry.kind)}`}
          />
        ))
      ) : (
        <InsetStaticRow label="Nothing recorded" />
      )}
    </InsetGroup>
  )
}

/** The plan the night ran from, and how much of it was actually used. */
function ThePlan({
  campaignId,
  night,
  tally,
}: {
  campaignId: string
  night: SessionNight
  tally: PlanTally | null
}) {
  const label = night.kind === 'played' ? 'The plan that night' : 'The plan tonight'

  if (!night.plan) {
    return (
      <InsetGroup
        label={label}
        footer={
          night.kind === 'played'
            ? 'No plan was linked to this night. You can link one when you close a session.'
            : 'Nothing planned for tonight yet.'
        }
      >
        <InsetStaticRow label="No plan" />
      </InsetGroup>
    )
  }

  return (
    <InsetGroup label={label}>
      <InsetLinkRow
        href={`/dm/campaigns/${campaignId}/session-plans/${night.plan.id}`}
        label={night.plan.title}
        hint={tally ? planRanLine(tally) : undefined}
      />
    </InsetGroup>
  )
}

/**
 * One night's page: its recap, its acts, its notes and its plan.
 *
 * `readOnly` is a closed campaign — history the DM may read and may not add
 * to. It reaches the notes as well as the sections: a table that is over does
 * not gain a new note.
 */
export function NightBoard({
  campaignId,
  night,
  tally,
  readOnly = false,
}: {
  campaignId: string
  night: SessionNight
  tally: PlanTally | null
  readOnly?: boolean
}) {
  return (
    <div className="space-y-6">
      {night.recap ? (
        <InsetGroup
          // The header carries the one fact that makes a recap different from
          // every other note on this page.
          label={night.recap.sharedWithPlayers ? 'Recap · players read this' : 'Recap · not shared'}
        >
          <RecapNote campaignId={campaignId} note={night.recap} />
        </InsetGroup>
      ) : null}

      <WhatHappened night={night} />

      <InsetGroup
        label="Your notes"
        footer="Yours unless you share one. A quick note typed during play lands on the end of tonight’s."
      >
        <NightNotes
          campaignId={campaignId}
          notes={night.notes}
          writeFor={night.date}
          readOnly={readOnly}
        />
        {night.notes.length === 0 && (readOnly || night.date === null) ? (
          <InsetStaticRow label="Nothing written" />
        ) : null}
      </InsetGroup>

      <ThePlan campaignId={campaignId} night={night} tally={tally} />
    </div>
  )
}
