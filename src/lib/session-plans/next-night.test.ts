import { nextPlannedNight } from './next-night'

// The rule behind the Prep tab's hero row (`dm-chronology/prep-tab`): which
// night the DM is writing next. Pure, so the three cases the stub names —
// a dated night in the future, an undated one, nothing — are three assertions
// rather than three fixtures in a database.

const TODAY = '2026-09-07'

function plan(sessionDate: string | null, createdAt: string) {
  return { sessionDate, createdAt: new Date(createdAt) }
}

describe('nextPlannedNight', () => {
  it('picks the soonest night dated today or later', () => {
    const soon = plan('2026-09-10', '2026-08-01T10:00:00.000Z')
    const later = plan('2026-09-24', '2026-08-01T09:00:00.000Z')

    expect(nextPlannedNight([later, soon], TODAY)).toBe(soon)
  })

  it('counts tonight as the next night, not a night gone by', () => {
    // A DM opening Prep on the morning of a session is prepping *that*
    // session; the date passes at midnight, not at breakfast.
    const tonight = plan(TODAY, '2026-08-01T10:00:00.000Z')

    expect(nextPlannedNight([tonight], TODAY)).toBe(tonight)
  })

  it('falls back to the newest undated plan when nothing is scheduled', () => {
    // The half-written night is the one being written. A dated night already
    // played does not come back round.
    const played = plan('2026-08-20', '2026-08-01T10:00:00.000Z')
    const older = plan(null, '2026-08-30T10:00:00.000Z')
    const newest = plan(null, '2026-09-02T10:00:00.000Z')

    expect(nextPlannedNight([played, older, newest], TODAY)).toBe(newest)
  })

  it('prefers a scheduled night over an undated one', () => {
    const undated = plan(null, '2026-09-06T10:00:00.000Z')
    const scheduled = plan('2026-09-10', '2026-08-01T10:00:00.000Z')

    expect(nextPlannedNight([undated, scheduled], TODAY)).toBe(scheduled)
  })

  it('has no next night for a campaign whose plans are all behind it', () => {
    expect(nextPlannedNight([plan('2026-08-20', '2026-08-01T10:00:00.000Z')], TODAY)).toBeNull()
  })

  it('has no next night for a campaign with no plans at all', () => {
    expect(nextPlannedNight([], TODAY)).toBeNull()
  })
})
