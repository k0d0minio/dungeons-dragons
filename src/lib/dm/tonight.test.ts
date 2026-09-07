import { isTonight, tonightsPlan } from './tonight'

// Which night the Play tab is about (`dm-chronology/play-tab`). Four answers,
// and the fourth is the one worth pinning: a plan dated before today wins
// nothing, because a night already played is history and history is Sessions'.
const TODAY = '2026-09-10'

function plan(sessionDate: string | null, createdAt: string, title = sessionDate ?? 'undated') {
  return { title, sessionDate, createdAt: new Date(createdAt) }
}

describe('tonightsPlan', () => {
  it('picks the plan dated today over everything else', () => {
    const tonight = plan(TODAY, '2026-09-01')

    const chosen = tonightsPlan(
      [plan('2026-09-17', '2026-09-09'), tonight, plan(null, '2026-09-09')],
      TODAY,
    )

    expect(chosen).toBe(tonight)
  })

  it('takes the newer of two plans written for the same night', () => {
    const later = plan(TODAY, '2026-09-09', 'the rewrite')

    expect(tonightsPlan([plan(TODAY, '2026-09-01'), later], TODAY)).toBe(later)
  })

  it('falls to the soonest night still ahead when none is tonight', () => {
    const thursday = plan('2026-09-17', '2026-09-02')

    const chosen = tonightsPlan([plan('2026-10-01', '2026-09-08'), thursday], TODAY)

    expect(chosen).toBe(thursday)
  })

  it('falls to the newest undated plan when no night is dated ahead', () => {
    const newest = plan(null, '2026-09-08', 'the one still being written')

    expect(tonightsPlan([plan(null, '2026-08-01'), newest], TODAY)).toBe(newest)
  })

  it('prefers a dated night ahead to an undated plan written more recently', () => {
    const ahead = plan('2026-09-17', '2026-08-01')

    expect(tonightsPlan([ahead, plan(null, '2026-09-09')], TODAY)).toBe(ahead)
  })

  it('answers null for no plans at all, and for none but last week’s', () => {
    expect(tonightsPlan([], TODAY)).toBeNull()
    // The property: a plan dated before today is not offered as tonight's. Its
    // secrets were ticked off on a night that is over, and putting them back on
    // screen would read as a night about to start.
    expect(tonightsPlan([plan('2026-09-03', '2026-09-01')], TODAY)).toBeNull()
  })
})

describe('isTonight', () => {
  it('is the date on the plan, and nothing derived', () => {
    expect(isTonight({ sessionDate: TODAY }, TODAY)).toBe(true)
    expect(isTonight({ sessionDate: '2026-09-17' }, TODAY)).toBe(false)
    expect(isTonight({ sessionDate: null }, TODAY)).toBe(false)
  })
})
