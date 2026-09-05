// Character data is per-user, so this route is session-gated. It answers 401
// rather than redirecting, which is why `/api/characters` is left out of the
// proxy matcher.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { startingMasteries, startingSpellSlots, weaponsToReady } from '@/lib/characters/readiness'
import { normaliseOriginSelections } from '@/lib/characters/rules'
import {
  characterCreateSchema,
  fieldErrorsOf,
  normaliseSkillSelections,
} from '@/lib/characters/schema'
import { startingInventory } from '@/lib/characters/wizard'
import { attachCharacterToCampaign } from '@/lib/db/campaigns'
import { createCharacter, listCharacters } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'
import { addStartingItems } from '@/lib/db/items'
import { isDm } from '@/lib/db/roles'

export const dynamic = 'force-dynamic'

/**
 * Say so rather than answering with an empty list — "you have no characters"
 * and "the database isn't wired up yet" are very different answers, and only
 * one of them should be quiet.
 */
function databaseUnconfigured() {
  return NextResponse.json(
    {
      error:
        'The database is not connected. If you run this app, see the database runbook in the repo docs.',
    },
    { status: 503 },
  )
}

export async function GET() {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isDatabaseConfigured()) {
    return databaseUnconfigured()
  }

  return NextResponse.json({ characters: await listCharacters(user.id) })
}

/**
 * Create a character owned by the signed-in user (DND-008).
 *
 * The body is validated against the same zod object the form uses, so the two
 * cannot drift. Reference indexes are taken on trust — deliberately, not for
 * want of a way to check them: the SRD spell list is local now, so validating
 * one would be a Map hit rather than the round trip it used to be. The worst
 * case is a friend-and-family player writing down a spell their class cannot
 * cast, which is their table's ruling to make, not this route's.
 *
 * The guided wizard (`guided-creation/wizard-frame`) posts here too, and adds
 * three things a one-page entry never has: the day-one prepared spells, which
 * of the SRD's starting-equipment clauses was taken, and the campaign the
 * character was made for. All three are optional and the old form sends none of
 * them, so a body written before the wizard existed still creates exactly the
 * character it did before.
 *
 * The equipment arrives as a *choice number*, never as items: the server reads
 * the same SRD lines the wizard showed and derives the inventory itself, so a
 * hand-rolled request cannot equip a 1st-level character with anything the
 * class does not hand out. Neither the items nor the campaign attachment can
 * fail the creation — `neon-http` has no transactions, and a character who
 * exists without their backpack is a fixable afternoon, while a 500 after the
 * insert would leave a character the player cannot see and cannot re-make.
 *
 * A wizard-made character is also *ready* (`first-table/creation-readiness`):
 * the kit's best melee weapon and a ranged one are marked equipped, a caster
 * gets the standard slot table, and a mastery class gets its masteries picked
 * from the kit. The three rules live in `src/lib/characters/readiness.ts`, and
 * the DM's profile page calls the same three to fix a character that already
 * exists — so what the wizard does on day one and what the DM presses a
 * button for on day two cannot disagree. All of it is confined to the wizard
 * path: a one-page body still produces exactly the insert it always did.
 */
export async function POST(request: Request) {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isDatabaseConfigured()) {
    return databaseUnconfigured()
  }

  // The DM runs the table and does not play a character
  // (`first-table/dm-front-door`, Jamie 2026-09-05). The role is global (D19)
  // and the refusal is here rather than only in the UI, so the wizard's own
  // request cannot make one for him either.
  if (await isDm(user.id)) {
    return NextResponse.json(
      { error: 'The DM does not play a character. Players make their own from the Character tab.' },
      { status: 403 },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = characterCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'That character is not valid', fieldErrors: fieldErrorsOf(parsed.error) },
      { status: 400 },
    )
  }

  const {
    knownSpellIndexes,
    preparedSpellIndexes,
    skillProficiencies,
    skillExpertise,
    backgroundIndex,
    backgroundAbilitySpread,
    backgroundAbilities,
    originFeatIndex,
    subclassIndex,
    masteredWeaponIndexes,
    campaignId,
    classEquipmentOption,
    backgroundEquipmentOption,
    ...character
  } = parsed.data

  const choices = {
    backgroundIndex,
    backgroundAbilitySpread,
    backgroundAbilities,
    originFeatIndex,
    subclassIndex,
    masteredWeaponIndexes,
  }

  // Normalised once here for the background the kit hangs off, and once more
  // below with the masteries the kit produced: the second pass is what caps
  // and de-duplicates them, so the readiness rule never has to know the
  // allowance.
  const background = normaliseOriginSelections(choices, character).backgroundIndex

  // Only the wizard names an equipment clause, so only the wizard gets a
  // backpack and starting coin — the one-page form's character keeps the empty
  // inventory and the zero purse it has always been created with.
  const equipping = classEquipmentOption !== undefined || backgroundEquipmentOption !== undefined
  const starting = equipping
    ? startingInventory({
        classIndex: character.classIndex,
        backgroundIndex: background ?? '',
        classEquipmentOption: classEquipmentOption ?? 0,
        backgroundEquipmentOption: backgroundEquipmentOption ?? 0,
      })
    : null

  // Ready the kit: the weapons the rule picks are equipped in the rows about
  // to be inserted, so the first Play segment this character ever shows has an
  // attack on it. One row per weapon — a bard's class daggers and a criminal's
  // background daggers are two rows of the same index, and the sheet prints an
  // attack line per readied row — so each pick is spent on the first row that
  // carries it (`delete` answers true exactly once per index).
  const readied = new Set(starting ? weaponsToReady(starting.items, character) : [])
  const items = (starting?.items ?? []).map((item) =>
    item.equipmentIndex !== null && readied.delete(item.equipmentIndex)
      ? { ...item, equipped: true }
      : item,
  )

  const origin = normaliseOriginSelections(
    {
      ...choices,
      // A body that names its masteries keeps them; the wizard sends none, and
      // gets them picked from the kit it was just handed.
      masteredWeaponIndexes:
        masteredWeaponIndexes ?? (starting ? startingMasteries(items, character) : null),
    },
    character,
  )

  const stored = await createCharacter(user.id, {
    ...character,
    // A duplicate would render twice on the sheet. The picker cannot produce
    // one; a hand-rolled request can. Which spells a class may cast is still
    // not this route's business — see above.
    knownSpellIndexes: Array.from(new Set(knownSpellIndexes)),
    // Named only by the wizard, and left to the column's own default otherwise:
    // writing an empty list for every one-page creation would be the same value
    // by a longer road, and this way the old body produces the old insert.
    ...(preparedSpellIndexes
      ? { preparedSpellIndexes: Array.from(new Set(preparedSpellIndexes)) }
      : {}),
    // Skill picks get the same de-duplication, plus the
    // expertise ⊆ proficiencies invariant (D21).
    ...normaliseSkillSelections(skillProficiencies, skillExpertise),
    // The 2024 origin block, held to the class and level it was chosen under:
    // the form's selects are already filtered by both, so this is the copy that
    // runs for a request the form did not send. Blanks come back as the `NULL`
    // the nullable columns hold.
    ...origin,
    // The purse and the slots ride only with a wizard-made character, for the
    // reason the prepared spells do: the old body produces the old insert.
    ...(starting
      ? {
          gp: starting.gold,
          spellSlots: startingSpellSlots(character.classIndex, character.level),
        }
      : {}),
  })

  if (items.length > 0) {
    await addStartingItems(stored.id, items)
  }

  // Closing the join → create → attach loop: a character made from a campaign's
  // join link joins that campaign's roster. `attachCharacterToCampaign` re-checks
  // that this user is actually at that table, so the id in the body is a
  // pointer, not a permission.
  if (campaignId) {
    await attachCharacterToCampaign(user.id, stored.id, campaignId)
  }

  return NextResponse.json({ character: stored }, { status: 201 })
}
