// The hand-off between the wizard and the first sheet
// (`triage/creation-completion-learn-link`).
//
// The wizard posts a character and pushes straight to `/characters/<id>` —
// deliberately, because the point of the last twenty minutes is the character
// and a new player should meet them, not a row about them. Nothing marks the
// moment, and it is the best moment in the app to offer `/learn`: someone who
// has just finished making a person is, for about thirty seconds, more curious
// about how to play them than they will be again before session 1.
//
// So the wizard leaves a note for the sheet, and the sheet claims it once.
//
// # Why this shape, and not a `characters.welcomed_at` column
//
// A column would follow the player to their second device, and buys nothing
// worth a migration: the band is one line, shown once, and the device that
// pushed to the sheet is by construction the device that made the character.
// It would also put a write on the read path of the sheet — the one page in
// the app that is opened mid-combat — to record that a banner was seen.
//
// # Why a hand-off, and not a set of character ids already welcomed
//
// The cheap answer to "shown only the first time this character is opened" is
// a seen-set: show the band for any id not in it, add the id, done. It is
// wrong in both directions. It grows without bound and can never be pruned —
// nothing on the device is told when a character is deleted — and, worse, it
// fires for characters that are *not* new: every character every existing
// player owns would be greeted as freshly made the next time it was opened, on
// a phone that had cleared its storage or on a second device.
//
// Inverting it fixes both. The key exists only between a create and the next
// sheet render, it is removed the moment it is claimed, and it is written by
// the one code path that knows a character is genuinely new. Absent means no
// band, so every failure — no storage, private mode, a full quota, a second
// device, a character made last month — fails to the quiet side.
import { readLocal, removeLocal, writeLocal } from '@/lib/browser-storage'

/** Where the note lives. Versioned in the key so a shape change cannot half-load. */
export const CHARACTER_WELCOME_KEY = 'dnd:character-welcome:v1'

/**
 * Leave the note. Called by the wizard once the character exists.
 *
 * One slot, overwritten rather than appended to: there is only ever one
 * most-recently-made character, and if two were made without stopping in
 * between it is the second one whose sheet is about to open.
 */
export function markCharacterWelcome(characterId: string): void {
  writeLocal(CHARACTER_WELCOME_KEY, characterId)
}

/**
 * Claim the note for `characterId` — true at most once, ever.
 *
 * Claiming *removes* it, so the band cannot come back on a reload, and a note
 * left by a create whose sheet was never opened cannot outlive the next one.
 * A note naming a different character is left alone: a DM may open a party
 * member's sheet between making their own character and looking at it.
 */
export function claimCharacterWelcome(characterId: string): boolean {
  if (readLocal(CHARACTER_WELCOME_KEY) !== characterId) return false

  removeLocal(CHARACTER_WELCOME_KEY)
  return true
}
