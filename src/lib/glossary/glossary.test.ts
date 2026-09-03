import { CHAPTER_KEY_TERMS, chapterKeyTerms } from './chapter-terms'
import { GLOSSARY, GLOSSARY_TERMS, glossaryTerm, relatedTerms } from './glossary'
import { RULES_CHAPTERS } from '@/lib/rules/chapters'

describe('glossary data', () => {
  it('holds the 40–60 terms the stub asked for', () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(40)
    expect(GLOSSARY_TERMS.length).toBeLessThanOrEqual(60)
  })

  it('gives every term a unique slug index', () => {
    const indexes = GLOSSARY_TERMS.map((entry) => entry.index)
    expect(new Set(indexes).size).toBe(indexes.length)
    for (const index of indexes) {
      expect(index).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('gives every term a name and a definition of at least two sentences', () => {
    for (const entry of GLOSSARY_TERMS) {
      expect(entry.term.trim()).not.toBe('')
      // Two sentences is the house length: enough to say what it is and what
      // beginners get wrong, short enough to read in a popover.
      const sentences = entry.definition.match(/[.!?](\s|$)/g) ?? []
      expect(sentences.length).toBeGreaterThanOrEqual(2)
      expect(entry.definition.length).toBeLessThan(420)
    }
  })

  it('resolves every "see also" to a term that exists, and never to itself', () => {
    for (const entry of GLOSSARY_TERMS) {
      for (const index of entry.seeAlso ?? []) {
        expect(GLOSSARY.has(index)).toBe(true)
        expect(index).not.toBe(entry.index)
      }
      expect(new Set(entry.seeAlso ?? []).size).toBe((entry.seeAlso ?? []).length)
    }
  })

  it('defines the terms the character sheet and the chapters name', () => {
    for (const index of [
      'armour-class',
      'initiative',
      'speed',
      'proficiency-bonus',
      'hit-points',
      'death-saving-throw',
      'concentration',
      'spell-slot',
      'condition',
      'long-rest',
    ]) {
      expect(GLOSSARY.has(index)).toBe(true)
    }
  })
})

describe('glossaryTerm', () => {
  it('returns the entry for an index it knows', () => {
    expect(glossaryTerm('spell-slot')?.term).toBe('Spell slot')
  })

  it('returns null for one it does not, rather than throwing', () => {
    expect(glossaryTerm('bardic-inspiration-but-cursed')).toBeNull()
  })
})

describe('relatedTerms', () => {
  it('resolves the see-also indexes to entries in order', () => {
    const entry = glossaryTerm('advantage')
    expect(entry).not.toBeNull()
    expect(relatedTerms(entry!).map((related) => related.index)).toEqual([
      'disadvantage',
      'd20-test',
    ])
  })

  it('is empty for a term with no see-also', () => {
    expect(relatedTerms({ index: 'x', term: 'X', definition: 'One. Two.' })).toEqual([])
  })

  it('drops a see-also index this build no longer defines', () => {
    expect(
      relatedTerms({
        index: 'x',
        term: 'X',
        definition: 'One. Two.',
        seeAlso: ['spell-slot', 'gone'],
      }).map((related) => related.index),
    ).toEqual(['spell-slot'])
  })
})

describe('chapter key terms', () => {
  it('covers every shipped rules chapter and nothing else', () => {
    expect(Object.keys(CHAPTER_KEY_TERMS).sort()).toEqual(
      RULES_CHAPTERS.map((chapter) => chapter.slug).sort(),
    )
  })

  it('names only terms the glossary defines, at most six a chapter', () => {
    for (const [slug, terms] of Object.entries(CHAPTER_KEY_TERMS)) {
      expect(terms.length).toBeGreaterThan(0)
      // Six is the strip's budget: more wraps to three lines on a phone.
      expect(terms.length).toBeLessThanOrEqual(6)
      expect(new Set(terms).size).toBe(terms.length)
      for (const index of terms) {
        expect(GLOSSARY.has(index)).toBe(true)
      }
      expect(chapterKeyTerms(slug)).toEqual(terms)
    }
  })

  it('answers with nothing for a slug it has never heard of', () => {
    expect(chapterKeyTerms('psionics')).toEqual([])
  })
})
