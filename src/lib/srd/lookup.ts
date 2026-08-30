// The one thing every SRD collection needs: "give me the entry with this index".
//
// Built once per collection at module load rather than per call — these are
// static arrays, and a sheet that resolves a species, a background, a class and
// four weapon masteries on one render should not walk four arrays to do it.

/** Anything the SRD data modules hold: an object keyed by a slug. */
interface Indexed {
  index: string
}

export interface SrdCollection<T extends Indexed> {
  /** Every entry, in the order the data module lists them (SRD order). */
  all: readonly T[]
  /** The entry with this index, or `null` for one the SRD does not define. */
  get(index: string): T | null
  /** True for an index this collection defines — what a form should validate against. */
  has(index: string): boolean
  /** Every index, for enumerating options or asserting completeness. */
  indexes: readonly string[]
}

/**
 * Wrap a data module as a lookup.
 *
 * `get` returns `null` rather than throwing for the same reason the 2014 rules
 * tables do: a character row can hold an index this build has never heard of
 * (a homebrew value, a set removed upstream), and a sheet that renders a blank
 * field is wrong by a visible amount while one that throws is gone.
 */
export function collection<T extends Indexed>(entries: readonly T[]): SrdCollection<T> {
  const byIndex = new Map(entries.map((entry) => [entry.index, entry]))
  return {
    all: entries,
    get: (index) => byIndex.get(index) ?? null,
    has: (index) => byIndex.has(index),
    indexes: entries.map((entry) => entry.index),
  }
}
