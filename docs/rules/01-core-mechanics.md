# 01 — Core Mechanics: The d20 Engine

> Purpose: the D&D core resolution rules (2024 rules, SRD 5.2.1) stated exactly, so everyone at the table resolves any d20 roll the same way every time.

## The D20 Test

Every uncertain action resolves the same way. The 2024 rules give the pattern a name — a **D20 Test** — and there are exactly three kinds of it: an ability check, a saving throw, and an attack roll. Anything that modifies "D20 Tests" modifies all three.

1. Roll **1d20**.
2. Add the relevant **ability modifier** (see the table below).
3. Add your **Proficiency Bonus** *if and only if* you are proficient in the thing being rolled — a skill, a saving throw, a weapon, a tool, or a rule that says to add it (spell attacks and spell save DCs).
4. Add or subtract any other bonuses and penalties: spells, class features, cover, Exhaustion, a Bless die.
5. Compare the total to a target number — a **Difficulty Class (DC)** for checks and saves, an **Armor Class (AC)** for attack rolls.
6. Total **≥** target means success. Total **<** target means failure. Meeting the number is beating it.

Stated once, and reused everywhere:

```
d20 + ability modifier + Proficiency Bonus (if proficient) + other modifiers  vs  DC or AC
```

## Natural 20 and natural 1

This is the rule that changed most between editions, and it is worth reading twice.

- A **natural 20** (a 20 on the die itself, before modifiers) means the D20 Test **automatically succeeds**, whatever the DC and whatever the modifiers. On an attack roll it is also a **Critical Hit**.
- A **natural 1** means the D20 Test **automatically fails**, whatever the modifiers.
- This applies to all three kinds of D20 Test: checks, saves, and attacks alike.

> **Changed from 2014:** in the 2014 rules the automatic success and failure applied only to attack rolls and death saves — a natural 20 on a Strength check still failed if the total was under the DC. Under the 2024 rules a natural 20 on any check succeeds. Set your DCs knowing that a 5% chance of success is now on the table for anything you allow a roll for.

Because a natural 1 always fails, the corollary matters too: if a task is genuinely impossible, do not call for a roll at all. A roll implies a 5% chance of success in both directions.

## The three kinds of D20 Test

Choosing the correct kind matters, because different features key off each one.

| Kind | Formula | Target | Who rolls | Typical trigger |
|---|---|---|---|---|
| **Ability check** | d20 + ability mod (+ Prof. Bonus if proficient in an applicable skill or tool) | DC set by the DM | The creature acting | Climbing, hiding, recalling lore, influencing an NPC |
| **Attack roll** | d20 + ability mod + Prof. Bonus (if proficient with the weapon or it's a spell attack) | The target's AC | The attacker | Weapon swings, Unarmed Strikes, spell attacks |
| **Saving throw** | d20 + ability mod (+ Prof. Bonus if proficient in that save) | DC set by the effect | The creature *resisting* | Dodging a fireball, resisting poison, shrugging off a Grapple |

Decision guide:

- Is the character *trying to do something* whose outcome is uncertain? That is an **ability check**.
- Is the character *trying to hit a target* with a weapon, an Unarmed Strike, or a spell that says "make an attack roll"? That is an **attack roll**.
- Is the character *reacting to* an effect that says "make a [ability] saving throw"? That is a **saving throw**. The effect always names the ability and gives the DC, or says how to work it out — a spell save DC is 8 + Proficiency Bonus + spellcasting ability modifier.

Consequences worth knowing:

- Effects that modify "ability checks" — the *Guidance* cantrip, Bardic Inspiration on a check — never touch attacks or saves unless they say so. Effects that modify "D20 Tests" touch everything.
- Initiative is a **Dexterity check**, so anything that helps ability checks helps initiative.
- Skills modify ability checks only. There is no such thing as a Perception saving throw.
- Exhaustion is written as a D20 Test penalty, which is why it drags down attacks, saves, checks, initiative and passive Perception all at once.

## Advantage and disadvantage

**Advantage**: roll 2d20 and use the **higher**. **Disadvantage**: roll 2d20 and use the **lower**.

| Rule | Statement |
|---|---|
| Never stacks | Two or more sources of Advantage are still one Advantage. The same for Disadvantage. You never roll 3d20. |
| Cancels flat | If a roll has *any* Advantage and *any* Disadvantage, it has neither: roll one d20 — even if it is three Advantages against one Disadvantage. |
| Reroll interaction | A feature that lets you reroll or replace a d20 applies to **one die only**. With Advantage or Disadvantage you choose which of the two dice to reroll, must keep the new result for that die, then take the higher or lower as normal. |
| One reroll source | If two features could reroll the same die, you may use only one of them. |
| Passive effect | Advantage on a passive check is +5; Disadvantage is −5. |

Common sources of **Advantage**: attacking a target with the Prone condition from within 5 feet; attacking a target that is Restrained, Paralyzed, Stunned or Unconscious; attacking while you have the Invisible condition; being Helped; the Dodge action ending (that one gives your attackers Disadvantage rather than you Advantage — see below).

Common sources of **Disadvantage**: attacking a Prone target from more than 5 feet away; shooting beyond a weapon's normal range; attacking while Poisoned or Frightened; being attacked while you have the Dodge action's benefit; making a ranged attack with an enemy within 5 feet of you; wearing armor you lack proficiency with.

### Unseen attackers and targets

- Attacking a target **you cannot see** gives you **Disadvantage**, and you must guess the space. A miss against an empty space is narrated as a miss; the DM does not normally say which it was.
- Attacking while you have the **Invisible** condition gives you **Advantage** — but only against creatures that cannot somehow see you.
- Attacking from hiding **ends the Invisible condition** you gained from hiding, hit or miss.
- If neither creature can see the other, Advantage and Disadvantage cancel and you roll one d20.

## Critical hits and damage rolls

- A damage roll is the attack's **damage dice + the ability modifier used for the attack** (Strength for melee, Dexterity for ranged, either for a Finesse weapon, the spellcasting modifier only when the spell says so) + any flat bonuses.
- On a **Critical Hit**, roll **all of the attack's damage dice twice** — the weapon dice and any extra dice the attack deals, such as Sneak Attack — and add the modifiers **once**. Flat modifiers are never doubled.
- **Resistance** halves damage of that type (round down); **Vulnerability** doubles it. Work in this order: add and subtract everything, then apply Resistance, then Vulnerability. Two sources of Resistance to the same instance of damage still halve it once, never quarter it.
- Damage from one effect lands all at once. A creature dropped to 0 hit points by part of it does not take the rest twice.

## Cover

Cover raises AC and Dexterity saving throws. Only the **highest** degree that applies counts; degrees never add together.

| Degree | Trigger | Effect |
|---|---|---|
| **Half cover** | An obstacle blocks at least half the target — a low wall, a creature in the way | +2 AC, +2 Dexterity saves |
| **Three-quarters cover** | At least three-quarters blocked — an arrow slit, a thick tree trunk | +5 AC, +5 Dexterity saves |
| **Total cover** | Completely concealed | Cannot be targeted directly by an attack or a spell |

## Proficiency Bonus

Your Proficiency Bonus comes from your **total character level** — never from your level in one class — or from a monster's Challenge Rating.

| Level | Bonus | Level | Bonus |
|---|---|---|---|
| 1–4 | +2 | 13–16 | +5 |
| 5–8 | +3 | 17–20 | +6 |
| 9–12 | +4 | | |

Hard rules:

- **Never add your Proficiency Bonus twice** to one roll, however many features grant the same proficiency. Duplicate proficiency is simply wasted.
- A feature that **multiplies** the bonus — Expertise doubles it, a bard's Jack of All Trades halves it and rounds down — multiplies it once, and only if the bonus applies at all. You cannot apply Expertise to something you are not proficient in, and two multipliers never combine.
- You add it only where you are proficient, or where a rule tells you to: spell attack rolls and spell save DCs both include it.

## Ability modifiers

The modifier is the score minus 10, halved and rounded down.

| Score | Mod | Score | Mod | Score | Mod |
|---|---|---|---|---|---|
| 1 | −5 | 10–11 | +0 | 20–21 | +5 |
| 2–3 | −4 | 12–13 | +1 | 22–23 | +6 |
| 4–5 | −3 | 14–15 | +2 | 24–25 | +7 |
| 6–7 | −2 | 16–17 | +3 | 26–27 | +8 |
| 8–9 | −1 | 18–19 | +4 | 28–29 | +9 |
| | | | | 30 | +10 |

- A character's score cannot pass **20** through a background increase, an Ability Score Improvement or a feat. Magic and monsters can reach **30**.
- The modifier, not the score, appears in every formula. The score itself matters only for a few specific things: the Heavy weapon property, some feat prerequisites, and the Influence action's DC.

## Typical Difficulty Classes

The DM sets the DC before anyone rolls.

| Task difficulty | DC |
|---|---|
| Very easy | 5 |
| Easy | 10 |
| Medium | 15 |
| Hard | 20 |
| Very hard | 25 |
| Nearly impossible | 30 |

DC 10 is "an untrained person manages it about half the time". DC 15 is the workhorse. Only set DC 5 if failing is still interesting — otherwise do not roll.

### When to call for a roll at all

Roll only when **all three** of these hold. Otherwise say what happens.

1. The outcome is **uncertain**. A locksmith picking a simple lock with all evening to do it just succeeds.
2. **Failure costs something** — time, noise, damage, a worse position.
3. The character **could plausibly succeed**. Under the 2024 rules a natural 20 always succeeds, so allowing a roll means allowing a 1-in-20 chance. If that outcome would be absurd, do not put dice on the table.

Repeated attempts: if nothing stops a retry and failure costs nothing, do not roll. The task simply takes longer and then works.

## Opposed rolls (mostly retired)

The 2014 rules resolved a lot of situations as a **contest** — two creatures rolling opposed checks, higher total wins. The 2024 rules replaced nearly all of them with a fixed DC or a saving throw, which is faster and puts the roll in the hands of the player.

| Situation | 2024 resolution |
|---|---|
| Grappling someone | An Unarmed Strike; the **target** makes a Strength or Dexterity saving throw against 8 + your Strength modifier + your Proficiency Bonus |
| Shoving someone | The same Unarmed Strike option and the same save |
| Hiding | A flat **DC 15** Dexterity (Stealth) check, not a check against anyone's Perception |
| Escaping a Grapple | The Grappled creature takes an action to make a Strength (Athletics) or Dexterity (Acrobatics) check against the grappler's escape DC |
| Influencing a creature | An **Influence** action: a Charisma or Wisdom check against a DC set by the creature (see chapter 09) |

Where two creatures genuinely push against each other and no rule covers it — an arm-wrestle, a tug of war — opposed checks are still the obvious tool, and a tie leaves the situation exactly as it was.

## Passive checks

A **passive check** is a check with no die roll, used for something done repeatedly and on average, and for checks the DM does not want to telegraph.

```
passive score = 10 + every modifier that would apply to the active check
              (+5 if the check would have Advantage, −5 if Disadvantage)
```

- **Passive Perception** = 10 + Wisdom modifier + Proficiency Bonus (if proficient in Perception, doubled for Expertise), minus any Exhaustion penalty. It is the number a hiding creature's Stealth check has to beat to go unnoticed by that observer.
- Passive scores never roll low. A high-level rogue with Expertise can sit in the mid-20s, and that is the intent.

## Group checks

When several creatures try something together and success is collective — sneaking as a party, navigating a swamp:

- Everyone rolls. If **at least half** the group succeeds, the whole group succeeds. Otherwise the whole group fails.
- Use a group check only where the capable can cover for the incapable. If one person's failure gives everyone away and nobody can compensate, that is an individual check.

## Helping

- The **Help** action lets you assist an ally's ability check or attack roll, or administer first aid.
- To help with an **ability check**, you must be proficient in the skill or tool involved. The ally rolls with Advantage.
- To help with an **attack roll**, you must be within 5 feet of the target. The ally has Advantage on its next attack roll against that target before the start of your next turn.
- To administer **first aid**, you stabilise a creature that has 0 hit points with a DC 10 Wisdom (Medicine) check.
- Only one creature can help. Advantage does not stack, so a second helper adds nothing.

> **Changed from 2014:** helping an ability check now requires the helper to be proficient. "I also try to persuade the guard" from someone with no relevant proficiency no longer grants Advantage.

## Heroic Inspiration

- The DM gives out **Heroic Inspiration** for heroic play, and some features grant it — a human's Resourceful trait hands one over after every Long Rest.
- You have it or you do not. Gaining a second while holding one does nothing; give the spare away if the table plays it that way.
- Expend it to **reroll any die immediately after rolling it**, and keep the new roll.

> **Changed from 2014:** Inspiration used to grant Advantage on a roll you had not yet made. Heroic Inspiration is spent *after* seeing a die you dislike, and it works on any die — a damage die, a healing die, a hit die on a rest — not only a d20.

## Rounding

**Always round down** unless a rule says otherwise. Half of 7 is 3. This covers half damage on a successful save, Jack of All Trades, halved Speed, and every other fraction in the game.

## Specific beats general

When a specific rule contradicts a general one, the **specific rule wins**, and only in its own scope.

- General: you get one action on your turn. Specific: Action Surge gives a fighter another one.
- General: your movement out of an enemy's reach provokes an Opportunity Attack. Specific: the Disengage action says it does not, for the rest of that turn.
- General: a Light weapon's extra attack is a Bonus Action. Specific: the Nick mastery property makes it part of the Attack action instead.

Monster traits, class features and spells break general rules constantly. That is design, not error.

## Rulings over rules

The DM is the referee. The written rules cannot cover every situation, and the DM's ruling at the table **is** the rule for that moment.

- Give the rules-as-written answer first, then say where a table ruling is usually needed.
- Never present a house rule — critical fumbles, flanking, drinking a potion as a Bonus Action — as though it were the printed rule.
- Where the rules are genuinely silent, say so and reach for the nearest analogous mechanic, which is almost always an ability check against a DC from the ladder above.

## Resolution checklist

The order to evaluate any d20 roll in:

1. **Classify** it: check, attack, or save. That decides which features apply.
2. **Sum the static modifiers**: ability modifier + Proficiency Bonus (if proficient — doubled for Expertise or halved for Jack of All Trades, once only) + flat bonuses + the Exhaustion penalty.
3. **Collapse the Advantage state**: any Advantage and any Disadvantage cancel to a plain d20; otherwise 2d20 keep high or 2d20 keep low.
4. **Roll**, then apply at most **one** reroll or replacement feature to at most one die. The new result stands.
5. **Check the natural roll**: a natural 20 succeeds and crits on an attack; a natural 1 fails. Both apply to every kind of D20 Test.
6. **Compare** the total to the DC or AC. Equal succeeds.
7. **On a Critical Hit**, double the damage *dice*, never the modifiers, then apply Resistance and Vulnerability last.

Round down at every fractional step. Never let two proficiency additions, two Advantages, or two rerolls into the same roll.

## Common table rulings

**Q: A player has Advantage from two sources and Disadvantage from one. What do they roll?**
A: One plain d20. Any Advantage plus any Disadvantage is a straight roll, whatever the counts.

**Q: Does a natural 20 on an ability check succeed automatically?**
A: Yes, under the 2024 rules. That is a real change from 2014 — the answer used to be no. It is also why "is there any chance at all?" is a question to settle before the dice come out.

**Q: Can two players both Help the rogue on one lockpicking check for double Advantage?**
A: No. Advantage never stacks, and only one creature can help at all. The second helper does nothing mechanically.

**Q: My cleric is proficient in Perception from two sources. Do they add the bonus twice?**
A: Never. The duplicate is wasted; ask the DM whether you may swap one of them for something else.

**Q: Is initiative affected by things that boost ability checks?**
A: Yes. Initiative is a Dexterity check, so Advantage on ability checks, the Alert feat and Exhaustion all apply to it.

**Q: The DC is 15 and the player rolls exactly 15. Success?**
A: Yes. Meeting the number is beating it.

**Q: Can a character apply Expertise to a check they are not proficient in?**
A: No. Expertise doubles a Proficiency Bonus that is already being added. Nothing to double, nothing happens.

**Q: I rolled the damage and it was terrible. Can I spend Heroic Inspiration?**
A: Yes. It rerolls any die immediately after it is rolled, and a damage die counts. You keep the new roll even if it is worse.
