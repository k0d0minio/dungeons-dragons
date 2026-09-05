# Stub: A finished character can attack, cast and master from the first tap

- feature-slug: creation-readiness
- sequence: 1 of 17
- depends-on: none
- priority: P1
- size: M
- sources: `.icm/docs/2026-09-05-first-timer-audit.md` §A.1, §A.2, §A.4;
  `.icm/docs/2026-09-05-first-timer-research.md` §1 (the attack line is the first thing a
  beginner is asked for), §5 (mastery is deferred for beginners — but the choice should
  exist); Jamie, 2026-09-05

What the walkthrough found on all seven real level-1 characters, 2026-09-05: every Play
segment reads "Equip a weapon in Inventory to see attacks." The Fighter's only attack is
Unarmed strike; the Paladin's backpack holds a longsword, six javelins, a spear and a
shortbow and the sheet offers none of them. `startingInventory`
(`src/lib/characters/wizard.ts`) marks a starting item `equipped: isWearable(index)` —
armour and shield, never a weapon. Five of the six casters show "No slots set up yet. A
level 1 X gets the standard table." — the wizard never writes `spellSlots`, and the cast
flow offers *Cast* on a levelled spell only once a slot exists, so Bless, Cure Wounds,
Hex, Burning Hands and Healing Word cannot be cast from five sheets until their owners
press a button no beginner has a reason to look for. `wizardCreateBody` writes
`masteredWeaponIndexes: null`, so the edit form says "0 of 2 weapons chosen".

## Build

Three pure, exported functions in the rules layer (`src/lib/characters/`), each taking a
character's current items and class and returning what to change — not knowing about
the wizard, because `dm-character-profile` calls the same three to fix a character that
already exists:

- **Which weapons to ready.** From the kit: one melee weapon, plus one ranged weapon if
  the kit has one. Prefer the weapon the class's ability priority favours (a Strength
  fighter readies the greatsword over the scimitar; a Dexterity rogue the rapier). A
  two-handed weapon and a shield are not a legal pair — decide that here, once, and keep
  the shield when the class's kit ships one. The shield and armour stay equipped as
  today.
- **Starting spell slots.** `standardSpellSlots(classIndex, 1)` (`rules.ts:1183`) —
  written into the create body for every class whose level-1 row has slots, paladin and
  ranger included (2024: half casters cast from 1st), and the warlock's pact slots as the
  table gives them. An empty object for a class without.
- **Starting masteries.** Up to `weaponMasteryCount(classIndex, 1)` of the kit's weapons
  that carry a mastery (`masteryFor` in `src/lib/srd/weapons.ts`), readied weapons first.
  `null` for a class with no count. Chosen even though `weapon-mastery-gate` hides it,
  because the choice should exist before the gate opens.

The wizard's create path calls all three. The Attacks card's empty state names what the
character carries and where to ready it ("Your longsword is in your pack — tap Gear and
switch on Equipped") instead of the generic line, for any character made before this
ships.

## Not here

- Changing the seven existing rows — Jamie: the DM fixes each from the profile view.
- Hiding mastery — `weapon-mastery-gate`.
- The "Not recorded" copy on the Me segment — `triage/beginner-copy-pass`.

## Done looks like

Every class × every starting-equipment option yields at least one readied weapon where
the kit has one, never an illegal pair; every level-1 caster class yields non-empty
slots; masteries never exceed the count and never name a weapon that is not in the kit.
A character created through the wizard opens on a Play segment with an attack row.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/creation-readiness.md`, then the epic's `breakdown.md` and
`.icm/docs/2026-09-05-first-timer-audit.md` §A. Build what the stub describes on a
`claude/` branch and open a PR; CI is the only evidence that counts. When it ships,
`git mv` the stub into `.icm/intake/first-table/_done/` in the same PR.
