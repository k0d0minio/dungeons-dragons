import { CRIB_SECTIONS, cribSection, type CribEntry } from './crib'
import { GLOSSARY } from '@/lib/glossary/glossary'
import { CONDITIONS } from '@/lib/srd/conditions'

// What the crib owes the DM (`dm-run-suite/dm-rules-crib`). The screen is
// unsearchable by design, so the content is the whole product: a row that is
// missing is a ruling the DM cannot find, and a row too long to read at a
// glance is one they will not.

const sections = CRIB_SECTIONS
const section = (id: string) => {
  const found = cribSection(id)
  if (!found) throw new Error(`no crib section '${id}'`)
  return found
}

/** Every label→answer row in a section, whatever block it sits in. */
function entriesOf(id: string): CribEntry[] {
  return section(id).blocks.flatMap((block) => (block.kind === 'entries' ? [...block.entries] : []))
}

function allEntries(): CribEntry[] {
  return sections.flatMap((s) =>
    s.blocks.flatMap((b) => (b.kind === 'entries' ? [...b.entries] : [])),
  )
}

describe('the crib’s shape', () => {
  it('gives every section a unique slug id and a chip short enough to sit in the row', () => {
    const ids = sections.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const s of sections) {
      expect(s.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(s.title.trim()).not.toBe('')
      // Two words at most: seven chips wrap to three rows on a phone as it is.
      expect(s.chip.length).toBeLessThanOrEqual(14)
    }
  })

  it('gives every section something to show', () => {
    for (const s of sections) {
      expect(s.blocks.length).toBeGreaterThan(0)
      for (const block of s.blocks) {
        if (block.kind === 'entries') expect(block.entries.length).toBeGreaterThan(0)
        if (block.kind === 'steps') expect(block.steps.length).toBeGreaterThan(0)
        if (block.kind === 'ladder') expect(block.rungs.length).toBeGreaterThan(0)
        if (block.kind === 'note') expect(block.text.trim()).not.toBe('')
      }
    }
  })

  it('keeps every row short enough to read in one glance', () => {
    for (const entry of allEntries()) {
      expect(entry.label.trim()).not.toBe('')
      expect(entry.detail.trim()).not.toBe('')
      // A five-second lookup is one line of type on a phone, or two at worst.
      expect(entry.detail.length).toBeLessThanOrEqual(160)
      // Never open with the row's own label — the label is printed beside it.
      expect(entry.detail.toLowerCase().startsWith(entry.label.toLowerCase())).toBe(false)
    }
  })

  it('never repeats a label inside one block', () => {
    for (const s of sections) {
      for (const block of s.blocks) {
        if (block.kind !== 'entries') continue
        const labels = block.entries.map((entry) => entry.label)
        expect(new Set(labels).size).toBe(labels.length)
      }
    }
  })

  it('points every glossary popover at a term this build actually defines', () => {
    const terms = allEntries()
      .map((entry) => entry.term)
      .filter((term): term is string => term !== undefined)

    // A dead popover is worse than a plain label, and `GlossaryTerm` fails
    // soft, so nothing on screen would say the link had rotted.
    expect(terms.length).toBeGreaterThan(0)
    for (const term of terms) expect(GLOSSARY.has(term)).toBe(true)
  })

  it('resolves a section by id and fails soft on one it does not have', () => {
    expect(cribSection('conditions')?.chip).toBe('Conditions')
    expect(cribSection('nonsense')).toBeNull()
  })
})

describe('what the stub asked to be on the screen', () => {
  it('groups by the moment at the table, not by rulebook chapter', () => {
    expect(sections.map((s) => s.id)).toEqual([
      'first-roll',
      'ruling',
      'turn',
      'conditions',
      'down',
      'sight',
      'travel',
      'arguments',
    ])
  })

  // The stop read before the session (`first-table/session-zero-one-pager`).
  it('opens with the ten-minute talk and the session zero checklist', () => {
    const talk = section('first-roll').blocks.find((block) => block.kind === 'steps')
    if (talk?.kind !== 'steps') throw new Error('the first-roll section lost its talk')

    expect(talk.steps).toHaveLength(5)
    expect(talk.steps[0]).toMatch(/describe what you do/i)
    expect(talk.steps.join(' ')).toMatch(/d20/)
    expect(talk.steps.join(' ')).toMatch(/hit points/i)
    expect(talk.steps.join(' ')).toMatch(/move and do one thing/i)
    expect(talk.steps.join(' ')).toMatch(/ask when you don’t know/i)

    expect(entriesOf('first-roll').map((entry) => entry.label)).toEqual([
      'Names',
      'Ties',
      'Lethality',
      'Phones',
      'Sixty seconds',
    ])
  })

  it('leads with the method for a player trying something odd', () => {
    const steps = section('ruling').blocks.find((block) => block.kind === 'steps')
    expect(steps?.kind === 'steps' && steps.steps.length).toBeGreaterThanOrEqual(4)

    // Pick an ability, then a DC — the two halves of an improvised ruling.
    const abilities = entriesOf('ruling').map((entry) => entry.label)
    expect(abilities).toEqual([
      'Strength',
      'Dexterity',
      'Constitution',
      'Intelligence',
      'Wisdom',
      'Charisma',
    ])
  })

  it('carries the DC ladder, easy 10 through hard 20, in order', () => {
    const ladder = section('ruling').blocks.find((block) => block.kind === 'ladder')
    if (ladder?.kind !== 'ladder') throw new Error('the ruling section lost its DC ladder')

    const values = ladder.rungs.map((rung) => Number(rung.value))
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(ladder.rungs).toEqual(
      expect.arrayContaining([
        { value: '10', label: 'Easy' },
        { value: '15', label: 'Medium' },
        { value: '20', label: 'Hard' },
      ]),
    )
  })

  it('holds all fifteen 2024 conditions, named as the data names them', () => {
    const labels = entriesOf('conditions')
    expect(labels).toHaveLength(15)
    expect(labels.map((entry) => entry.label)).toEqual(
      CONDITIONS.all.map((condition) => condition.name),
    )
  })

  it('gives the three grades of cover their bonuses', () => {
    const cover = entriesOf('sight')
    expect(cover.find((entry) => entry.label === 'Half cover')?.detail).toContain('+2')
    expect(cover.find((entry) => entry.label === 'Three-quarters cover')?.detail).toContain('+5')
    expect(cover.find((entry) => entry.label === 'Total cover')?.detail).toMatch(
      /cannot be targeted/i,
    )
  })

  it('answers light and vision, darkvision included', () => {
    const labels = entriesOf('sight').map((entry) => entry.label)
    expect(labels).toEqual(expect.arrayContaining(['Dim light', 'Darkness', 'Darkvision', 'Torch']))
  })

  it('walks the DM through someone hitting 0 hit points, in order', () => {
    const steps = section('down').blocks.find((block) => block.kind === 'steps')
    if (steps?.kind !== 'steps') throw new Error('the 0 HP section lost its steps')

    expect(steps.steps.length).toBeGreaterThanOrEqual(4)
    expect(steps.steps.join(' ')).toMatch(/three successes/i)
    expect(steps.steps.join(' ')).toMatch(/natural 20/i)
  })

  it('carries the turn budget and the common actions', () => {
    const labels = entriesOf('turn').map((entry) => entry.label)
    for (const expected of [
      'Movement',
      'Action',
      'Bonus action',
      'Reaction',
      'Attack',
      'Dash',
      'Disengage',
      'Dodge',
      'Help',
      'Hide',
      'Ready',
      'Search',
    ]) {
      expect(labels).toContain(expected)
    }
  })

  it('carries the three travel paces and both rests', () => {
    const labels = entriesOf('travel').map((entry) => entry.label)
    expect(labels).toEqual(
      expect.arrayContaining(['Fast', 'Normal', 'Slow', 'Short rest', 'Long rest']),
    )
  })

  it('settles the arguments a first table actually has', () => {
    const labels = entriesOf('arguments').map((entry) => entry.label)
    expect(labels.length).toBeGreaterThanOrEqual(10)
    expect(labels).toEqual(
      expect.arrayContaining(['Natural 20 on a check', 'Critical hits', 'Flanking', 'Surprise']),
    )
  })
})
