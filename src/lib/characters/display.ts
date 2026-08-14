// Presentation helpers shared by the creation form and the character list.
//
// Nothing here touches the network or the database: the derived values 5e
// defines (ability modifiers) are cheap enough to compute at render time, which
// is why `src/lib/db/schema.ts` does not store them.

/** The 5e ability modifier for a score: `floor((score - 10) / 2)`. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * A modifier as a character sheet prints it — `+3`, `0`, `-1`.
 *
 * Returns an em dash for anything that is not a real number, because the form
 * shows a live modifier beside a field the player can empty mid-edit and
 * "+NaN" is alarming in a way an empty field is not.
 */
export function formatModifier(modifier: number): string {
  if (!Number.isFinite(modifier)) return '—'
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

/**
 * A dnd5eapi index as a label: `half-elf` → `Half-Elf`, `wizard` → `Wizard`.
 *
 * The list page shows a saved character's class and species without a round
 * trip to the reference API — the indexes are stable slugs and this is what
 * they read as. The form itself shows the API's own `name`, which stays
 * authoritative wherever it is available.
 */
export function formatReferenceIndex(index: string): string {
  return index
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join('-')
}
