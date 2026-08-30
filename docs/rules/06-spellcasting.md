# 06 — Spellcasting

> Purpose: the complete 2024 spellcasting rules (SRD 5.2.1) stated exactly — slot tables, the Concentration state machine, action-economy limits, and targeting.

## Anatomy of a spell

Every spell is described by the same six fields.

| Field | Meaning | The rule it carries |
|---|---|---|
| **Level** | 0 (a cantrip) through 9 | Casting it needs a slot of that level **or higher**. Cantrips need no slot |
| **School** | Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy or Transmutation | No mechanics of its own; other features key off it |
| **Casting time** | Action, Bonus Action, Reaction, or a stretch of minutes or hours | Decides which part of your turn it costs |
| **Range** | Self, Touch, a distance, Sight or Unlimited | The target or the point of origin must be inside it when you cast |
| **Components** | V, S, M | See below |
| **Duration** | Instantaneous, a span of time, or "Concentration, up to…" | A Concentration duration engages the state machine below |

### Components

- **Verbal (V)**: you must be able to speak audibly. Gagged, or inside a silenced area, and the spell does not happen.
- **Somatic (S)**: you need at least one **free hand** for the gestures.
- **Material (M)**: you need the listed materials, or a **component pouch**, or a **spellcasting focus** your class can use — with two exceptions. A component with a **gold-piece cost** must be the real thing, and a component the spell says is **consumed** is used up each time.
- The hand holding your focus or pouch can be the same hand doing the somatic gestures. A spell with S and no M still needs a hand with nothing in it.
- A caster holding a weapon in one hand and a shield on the other arm has no free hand and cannot make somatic gestures. Stow something with your free object interaction.

## Cantrips

- Level 0, always known, cast at will. No slot and no daily limit.
- A damage cantrip scales with your **character level**, not your class level and not the slot you did not spend:

| Character level | Dice | Example: Fire Bolt |
|---|---|---|
| 1–4 | ×1 | 1d10 |
| 5–10 | ×2 | 2d10 |
| 11–16 | ×3 | 3d10 |
| 17–20 | ×4 | 4d10 |

How many cantrips each class knows is in `04-classes.md`.

## Spell slots

A slot is what a leveled spell spends. Casting a level-N spell expends one slot of level N or higher.

- **Upcasting**: the spell is cast *at the slot's level*, and its own text says what the extra level buys. No text means no benefit, but the slot is still legal to burn.
- Everything that asks "what level was this spell?" — dispelling, for one — means the **slot level it was cast with**.
- All slots return on a **Long Rest**. Pact Magic is the exception: those come back on a Short Rest.

The slot tables — full caster, half caster and Pact Magic — are in `04-classes.md`, alongside the prepared-spell counts, because they are read per class.

The short version: bard, cleric, druid, sorcerer and wizard read the full table at their level. Paladin and ranger read it at **half their level rounded up**, which means they have two level-1 slots from level 1. Warlocks have their own small pool of same-level slots.

## Preparing spells

Under the 2024 rules there is only one model, and "spells known" is gone.

| | How it works |
|---|---|
| **Every caster except the wizard** | Choose your prepared spells from your **entire class list**, up to the number on your class table. Change them when you finish a Long Rest |
| **Wizard** | Choose from your **spellbook**, which is its own list — 6 spells at level 1, 2 more each level, plus anything you find and copy |
| **Cantrips** | Never prepared. They are known, and change only when a feature says so |

> **Changed from 2014:** bards, sorcerers, warlocks and rangers used to learn a fixed list and swap one spell per level-up. They now prepare like everyone else, from the whole class list, and rebuild the list after each Long Rest. How many they prepare is set by the class table rather than by an ability modifier, so raising Wisdom no longer gives a cleric more spells.

Preparing a spell costs nothing and casting it does not unprepare it — a prepared spell can be cast as often as your slots allow.

## Rituals

- A spell with the **Ritual** tag can be cast as a ritual if you have it prepared.
- A ritual takes **10 minutes longer** than the spell's normal casting time and **expends no slot**. It is cast at its base level, so no upcasting.
- The wizard's **Ritual Adept** goes further: any ritual in the spellbook, prepared or not, read straight from the book.
- Rituals still need their components, and still need Concentration if the spell says so.

> **Changed from 2014:** ritual casting is no longer a class feature only four classes had. Any caster with a ritual prepared can cast it as one.

## Casting in armor

You must be **proficient** with the armor you are wearing to cast at all. This is absolute, not a penalty.

## Concentration

Casting a spell whose duration says "Concentration, up to…" puts you into it. So does holding a **readied** spell.

Concentration ends immediately on any of these:

| Trigger | Rule |
|---|---|
| You cast another Concentration spell | The first ends the moment the new casting starts, even if the new spell then fails. One at a time, always |
| **You take damage** | A **Constitution saving throw**, DC 10 or half the damage taken, whichever is higher. Failure breaks it. One save per separate source of damage — three arrows is three saves |
| You become **Incapacitated** or die | Automatic, no save. Stunned, Paralyzed and Unconscious all include Incapacitated |
| You choose to stop | Free, no action, at any time, including on someone else's turn |
| The DM calls for it | A DC 10 Constitution save for something violent in the environment |
| The duration runs out | Normal end |

Concentration does not stop you moving, attacking, or casting spells that do not need Concentration. Damage reduced to 0 forces no save, because no damage was taken.

## Casting time and the action economy

- **Action**: the default. This is the **Magic** action.
- **Bonus Action**: spends your Bonus Action.
- **Reaction**: cast when the spell's stated trigger happens, on any turn. One Reaction per round.
- **Minutes or hours**: you spend your action every turn of the cast and must hold Concentration throughout. The slot is only spent when the cast completes, so an interruption wastes the time but not the slot.

**The one rule that governs the rest: you can cast only one spell that expends a spell slot on your turn.**

That is the whole of it. Cantrips do not count against it, so a Bonus Action Misty Step followed by an action Fire Bolt is fine. Two leveled spells in a turn are not — not with Action Surge, not with Quickened Spell, not with a Bonus Action heal after an action spell.

> **Changed from 2014:** the old rule was narrower and more confusing — casting *any* spell as a Bonus Action locked your other spell that turn to a one-action cantrip. The 2024 rule bans the second slot outright and leaves cantrips alone, which makes bonus-action cantrip combinations legal that never were before, and makes a few beloved two-spell turns illegal.

### Timing edge cases

| Situation | Ruling |
|---|---|
| Two Reaction spells in one round | Impossible for one caster. One Reaction per round, refreshing at the start of your turn |
| A Reaction spell on your own turn | Legal, if the trigger happens — Shield against a readied attack, for instance |
| A leveled Bonus Action spell, then a Reaction spell later in the round | Legal. The one-slot limit is per **turn**, and a Reaction on someone else's turn is not your turn |
| Casting the same Concentration spell twice | The second cast ends the first |
| A spell that gets stopped after you cast it | The slot is spent regardless |

## Attack rolls, saves and DCs

```
spell attack bonus = Proficiency Bonus + spellcasting ability modifier
spell save DC      = 8 + Proficiency Bonus + spellcasting ability modifier
```

- A **spell attack** is d20 + that bonus against the target's AC, can score a Critical Hit that doubles the spell's damage dice, and takes Disadvantage at range with a hostile creature within 5 feet of you.
- A **saving throw** is the target rolling against your DC. The spell names the ability and says what a success does.
- **Half on a save** is a convention, not a default. Many damage spells say it. Never assume it.
- Casting abilities: Intelligence for the wizard; Wisdom for the cleric, druid and ranger; Charisma for the bard, paladin, sorcerer and warlock.

## Areas of effect

Every area has a **point of origin** placed within the spell's range, and the area is blocked by **total cover** relative to that point.

| Shape | Definition |
|---|---|
| **Cone** | Spreads from the origin in a direction; its width at any point equals its distance from the origin, so a 15-foot Cone is 15 feet wide at the far end |
| **Cube** | A side length; the origin sits on one face |
| **Cylinder** | A radius and a height; the origin is the centre of the top or bottom circle |
| **Line** | A length and a width, usually 5 feet, straight from the origin |
| **Sphere** | A radius from the origin |
| **Emanation** | Spreads from a **creature** in every direction and **moves with it**; the creature's own space is not part of the area |

**Emanation** is new in 2024 and it is the shape a paladin's Aura of Protection and a barbarian's Intimidating Presence use — an area that travels with the character instead of sitting on the map.

**The 15-foot cone on a grid**: aimed along a row it covers roughly a widening 1/2/3 triangle of squares; aimed diagonally it steps. Pick one convention at your table and never argue about it again.

**Eyeballing how many creatures an area will catch**, rounding up and never below 1:

| Shape | Targets ≈ |
|---|---|
| Cone | size ÷ 10 |
| Cube or square | size ÷ 5 |
| Cylinder | radius ÷ 5 |
| Line | length ÷ 30 |
| Sphere or circle | radius ÷ 5 |

## Combining magical effects

- **The same spell does not stack with itself.** While two instances overlap, the most potent applies; when it ends, a weaker one still running resumes.
- Different spells stack freely. Bless and Haste on the same fighter is fine.
- The same rule covers identical non-spell effects unless one of them says otherwise.

## Counterspell, dispelling, and reading a cast

- **Counterspell** is a level 3 Reaction cast when you see a creature within 60 feet casting. The target makes a **Constitution saving throw** against your spell save DC; on a failure, its spell fails and its slot is still spent. Level no longer enters into it.
- **Dispel Magic** ends any spell of **level 3 or lower** on the target automatically. For each spell of level 4 or higher, make an ability check with your spellcasting ability against DC 10 + that spell's level. It does nothing to an instantaneous effect — the damage already happened — or to magic that is not a spell.
- **Identifying a spell as it is cast** is not something the rules give you a roll for. What you can perceive is the casting itself, through its verbal, somatic and material components. Counterspell is a bet placed on a gesture, which is the point of it.

> **Changed from 2014:** Counterspell was a level comparison with a check for anything higher. It is now a flat save against your DC, which makes it far better against high-level casters and far worse against tough ones.

## Targeting

- **"A creature you can see"** means exactly that. A blinded caster cannot, and an Invisible creature cannot be picked out.
- **A clear path** is required: a target behind **total cover** cannot be targeted at all, however visible and however close.
- If you place an area's point of origin somewhere you have no clear path to, it lands on the near side of the obstruction.
- **Range: Self** means you are the target, or the origin of the area.
- Targeting something the spell cannot affect wastes the slot and does nothing. Say so at the table before it comes up.

## Sorcerer Metamagic

Sorcery Points equal the sorcerer's level from level 2, and refresh on a Long Rest, with some coming back on a Short Rest from level 5. Points and slots convert both ways — the costs are in `04-classes.md`.

Metamagic is chosen from these options:

| Metamagic | Effect |
|---|---|
| **Careful Spell** | Chosen creatures automatically succeed on the spell's saving throw and take no damage from it |
| **Distant Spell** | Double the range of a ranged spell, or make a Touch spell reach 30 feet |
| **Empowered Spell** | Reroll some of the damage dice and keep the new rolls |
| **Extended Spell** | Double a duration of 1 minute or more, up to 24 hours |
| **Heightened Spell** | One target has Disadvantage on its first save against the spell |
| **Quickened Spell** | An Action casting time becomes a Bonus Action |
| **Seeking Spell** | Reroll a missed spell attack roll |
| **Subtle Spell** | Cast without verbal or somatic components — nothing to see, nothing to counter on |
| **Transmuted Spell** | Change the spell's damage type to acid, cold, fire, lightning, poison or thunder |
| **Twinned Spell** | A spell that targets only one creature targets a second one |

Only one Metamagic option per casting, except that **Empowered Spell** may be combined with another.

Note that Quickened Spell no longer buys you a second leveled spell. It buys you the Bonus Action timing, and the one-slot-per-turn rule still applies.

## Spells worth knowing cold

These come up constantly. C marks Concentration, BA a Bonus Action casting time, Rx a Reaction.

| Spell | Level | School | Flags | Why it matters |
|---|---|---|---|---|
| Guidance | 0 | Divination | C | +1d4 on an ability check; on constantly out of combat |
| True Strike | 0 | Divination | — | An attack with your weapon using your spellcasting ability, with radiant damage added as you level. The cantrip that lets a caster hold a sword |
| Bless | 1 | Enchantment | C | +1d4 to attack rolls and saves for three creatures. The best low-level buff in the game |
| Cure Wounds | 1 | Abjuration | — | A touch heal that scales with the slot |
| Healing Word | 1 | Abjuration | BA | A 60-foot Bonus Action heal, and the reason a downed ally is rarely dead |
| Divine Smite | 1 | Evocation | BA | The paladin's burst, now a spell — one per turn, like every other slot |
| Hunter's Mark | 1 | Divination | C | The ranger's whole build in one Concentration slot |
| Mage Armor | 1 | Abjuration | — | AC 13 + Dexterity for 8 hours, no armor needed |
| Shield | 1 | Abjuration | Rx | +5 AC until your next turn, declared after you see the attack |
| Hold Person | 2 | Enchantment | C | Paralyses a humanoid; it saves each turn, and melee hits on it crit |
| Invisibility | 2 | Illusion | C | Ends when the target attacks or casts |
| Misty Step | 2 | Conjuration | BA | 30 feet of teleport, provoking nothing |
| Suggestion | 2 | Enchantment | C | Social control, as long as the course of action sounds reasonable |
| Web | 2 | Conjuration | C | Area control that Restrains, and burns |
| Counterspell | 3 | Abjuration | Rx | A Constitution save against your DC; no more level comparison |
| Dispel Magic | 3 | Abjuration | — | Ends ongoing spells; nothing to instantaneous ones |
| Fireball | 3 | Evocation | — | 8d6 in a 20-foot-radius Sphere, Dexterity save for half |
| Fly | 3 | Transmutation | C | A 60-foot Fly Speed, and a long drop when Concentration breaks |
| Revivify | 3 | Necromancy | — | Dead for under a minute becomes alive on 1 hit point. Costs a 300 GP diamond, and a focus will not stand in for it |
| Banishment | 4 | Abjuration | C | A Charisma save, and gone |
| Polymorph | 4 | Transmutation | C | A Wisdom save; the beast form's hit points act as a buffer |

## Casting a spell — the order to resolve it in

1. **Check it is legal**, before anything is spent: the spell is prepared (or in the book, for a wizard's ritual); the casting-time resource is free; you have not already spent a slot this turn; the components are satisfiable; your armor is one you are proficient with; the target is in range, visible if the spell needs sight, and not behind total cover.
2. **Spend**: expend a slot of at least the spell's level, and consume any consumed material.
3. **Concentration handshake**: if the new spell needs Concentration, whatever you were concentrating on ends now.
4. **Resolve**: attack rolls against AC, or saving throws against your DC. Roll an area's damage once and apply it to everyone in it.
5. **Record**: the duration, the Concentration link, and the **slot level it was cast at**, because that is the number every later question asks for.

## Rests and recovery

| Resource | Short Rest (1 hour) | Long Rest (8 hours) |
|---|---|---|
| Standard spell slots | — | All back |
| Pact Magic slots | All back | All back |
| Sorcery Points | Some, from level 5 | All back |
| Wizard Arcane Recovery | Slots totalling half your wizard level rounded up, none of level 6 or higher, once per Long Rest | Resets its availability |
| Warlock Magical Cunning | — | Half your pact slots back, once per Long Rest |
| Which spells are prepared | — | Rebuild the list |
| Hit points and Hit Dice | Spend Hit Dice to heal | All hit points; half your Hit Dice back |

## What to keep track of

- Your **casting ability**, because the save DC and the attack bonus both come from it.
- Your **prepared list**, and your cantrips separately.
- **Slots remaining** by level — and Pact slots and Sorcery Points as their own pools.
- **What you are concentrating on**, and the slot level it was cast at.
- Whether you have already spent a **slot this turn**.

## Common table rulings

**Q: Can I cast Misty Step and Fire Bolt on the same turn?**
A: Yes. Fire Bolt is a cantrip and spends no slot, so the one-slot-per-turn rule is untouched.

**Q: Can I cast Healing Word and then Cure Wounds?**
A: No. Both spend slots, and only one slot-spending spell is allowed per turn.

**Q: Can I Counterspell a Counterspell?**
A: Yes. Counterspell is a spell being cast within 60 feet, and another caster with a Reaction can answer it.

**Q: Do two Bless spells on the same target give +2d4?**
A: No. A spell never stacks with itself; the stronger instance applies while both run.

**Q: I am holding a sword and shield. Can I cast?**
A: Not anything with a somatic component, without a free hand. Stow something with your free object interaction, or take a Fighting Style or feature that solves it.

**Q: My ranger has Hunter's Mark up and wants to cast another Concentration spell.**
A: The mark drops the instant the new casting begins. From level 13 the ranger stops losing it to damage, but never to a second Concentration spell.

**Q: Can a warlock upcast with a pact slot?**
A: Warlock slots are always at their single highest level, so every leveled spell they cast is automatically at that level. That is the upside of having so few.

**Q: Can I ready a Fireball for whatever comes through the door?**
A: Yes, but you cast it now. The slot is spent immediately, holding it requires Concentration — which drops anything else you were concentrating on — and if the trigger never fires, the slot is gone.

**Q: Does losing Concentration on Fly mid-air kill me?**
A: You fall: 1d6 per 10 feet to a maximum of 20d6, and you land Prone. There is no grace period in the rules.

**Q: Does Dispel Magic remove a curse, or undo a Fireball?**
A: Neither. It ends ongoing **spells** with a duration. Damage already dealt is over, and a curse is not a spell effect with a slot behind it.
