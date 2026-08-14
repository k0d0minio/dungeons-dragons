# 01 — Core Mechanics: The d20 Engine

> Purpose: exact, testable statements of the D&D 5e (SRD 5.1, 2014) core resolution rules, so AI tools and humans at the table resolve any d20 roll the same way every time.

## The core resolution loop

Every uncertain action in 5e resolves the same way:

1. Roll **1d20**.
2. Add the relevant **ability modifier** (see table below).
3. Add **proficiency bonus** *if and only if* the character is proficient in the thing being rolled (a skill, a saving throw, a weapon, a tool, a spell attack).
4. Add or subtract any situational bonuses or penalties (spells, class features, cover, etc.).
5. Compare the total to a target number:
   - **Difficulty Class (DC)** for ability checks and saving throws.
   - **Armor Class (AC)** for attack rolls.
6. Total **≥** target ⇒ success. Total **<** target ⇒ failure. Ties go to the roller.

Formula, stated once and reused everywhere:

```
d20 + ability modifier + proficiency bonus (if proficient) + situational modifiers  vs  DC or AC
```

- A natural 20 on an **attack roll** always hits and is a **critical hit** (roll all the attack's damage dice twice).
- A natural 1 on an **attack roll** always misses.
- Natural 1s and 20s have **no special meaning** on ability checks or saving throws in the 2014 rules. (Except death saving throws — see below.)

> **2024 note:** in the 2024 revision a natural 20 on any d20 Test (check, attack, or save) also grants Heroic Inspiration; auto-success/failure on nat 20/1 still applies only to attacks, saves, and death saves — checks can still fail on a 20.

- On a **death saving throw** (a special saving throw with no ability modifier, DC 10): natural 1 counts as two failures; natural 20 means the character regains 1 hit point immediately.

## The three roll types

Everything a d20 is rolled for is exactly one of these three. Choosing the correct type matters because different features key off each. (`API: /api/2014/rule-sections/ability-checks`)

| Roll type | Formula | Target | Who initiates | Typical trigger |
|---|---|---|---|---|
| **Ability check** | d20 + ability mod (+ prof if proficient in an applicable skill/tool) | DC set by DM | The creature acting | Climbing, sneaking, recalling lore, persuading |
| **Attack roll** | d20 + ability mod + prof (if proficient with the weapon/spell) | Target's AC | The attacker | Weapon swings, spell attacks (e.g. rays) |
| **Saving throw** | d20 + ability mod (+ prof if proficient in that save) | DC set by the effect | The creature *resisting* | Dodging a fireball, resisting poison or charm |

Decision guide:

- Is the character *trying to do something* whose outcome is uncertain? → **Ability check**.
- Is the character *trying to hit a target* with a weapon, unarmed strike, or spell that says "make an attack roll"? → **Attack roll**.
- Is the character *reacting to* an effect that says "make a [ability] saving throw"? → **Saving throw**. The effect's text always names the ability and states the DC (or how to compute it, e.g. spell save DC = 8 + prof + spellcasting ability mod).

Key consequences of the distinction:

- Effects that modify "ability checks" (e.g. the **guidance** spell, Bardic Inspiration on checks) never apply to attacks or saves unless they say so.
- Initiative is a **Dexterity ability check** — check-modifying effects apply to it.
- Skills modify ability checks only; there is no such thing as a "Perception saving throw."

## Advantage and disadvantage

**Advantage**: roll 2d20, use the **higher**. **Disadvantage**: roll 2d20, use the **lower**. (`API: /api/2014/rule-sections/advantage-and-disadvantage`)

Exact rules, each independently testable:

| Rule | Statement |
|---|---|
| Never stacks | Two or more sources of advantage = one advantage. Same for disadvantage. You never roll 3d20. |
| Cancels flat | If you have *any* source of advantage and *any* source of disadvantage, they cancel: roll 1d20 normally — even if it's 3 advantages vs 1 disadvantage. |
| Reroll interaction | Features that let you reroll or replace a d20 (e.g. the Halfling's **Lucky** trait rerolling a natural 1) apply to **one die only**. With adv/dis, you choose which of the two dice to reroll — after the reroll you must use the new result for that die, then apply higher/lower as normal. |
| One reroll source | If more than one feature could reroll the same die, you may use **only one** of them per roll. |
| Passive effect | Advantage on a passive check = +5; disadvantage = −5 (see Passive checks). |

Common sources — advantage: attacking a prone target from within 5 ft, attacking a restrained/paralyzed/unconscious target, attacking while unseen, Help action, flanking (optional rule only). Disadvantage: attacking a prone target from beyond 5 ft, long range, attacking while poisoned/frightened (frightened requires the source in sight), ranged attack with a hostile creature within 5 ft, squeezing.

### Unseen attackers and targets

- Attacking a target **you can't see**: **disadvantage** on the attack roll (you must guess the space; a miss vs an empty space is narrated as a miss, and the DM typically doesn't reveal whether the guess was right).
- Attacking **while unseen** by the target: **advantage** on the attack roll.
- Making an attack while hidden **reveals your location** whether it hits or misses.
- Both at once (two creatures who can't see each other) ⇒ advantage + disadvantage ⇒ straight roll.

## Critical hits and damage rolls

- Damage roll = the attack's **damage dice + the relevant ability modifier** (STR for melee, DEX for finesse/ranged, spellcasting mod only when the spell says so) + flat bonuses.
- On a **critical hit** (natural 20 on the attack roll): roll **all of the attack's damage dice twice**, including extra dice from features like Sneak Attack or a paladin-style smite delivered by the attack — then add modifiers **once**. Flat modifiers are never doubled.
- **Resistance** halves damage of that type (round down); **vulnerability** doubles it. Apply order: all additions/subtractions first, then resistance, then vulnerability. Multiple resistances to the same damage instance count once (halve once, never quarter).
- Damage from a single effect hits simultaneously; a creature reduced to 0 HP by one source doesn't "die twice" to the rest of it.

## Cover

Cover modifies AC and Dexterity saving throws; only the **highest degree** applies (they don't stack):

| Degree | Trigger | Effect |
|---|---|---|
| **Half cover** | Obstacle blocks ≥ half the body (low wall, another creature) | +2 AC, +2 DEX saves |
| **Three-quarters cover** | ≥ three-quarters blocked (arrow slit, thick trunk) | +5 AC, +5 DEX saves |
| **Total cover** | Completely concealed | Can't be targeted directly by attacks or spells |

## Proficiency bonus

Proficiency bonus is set by **total character level** (or a monster's CR), never by class level in a single class. (`API: /api/2014/rule-sections/proficiency-bonus`)

| Level | Bonus | Level | Bonus |
|---|---|---|---|
| 1–4 | +2 | 13–16 | +5 |
| 5–8 | +3 | 17–20 | +6 |
| 9–12 | +4 | | |

Hard rules:

- **Never add proficiency bonus twice** to one roll, even if two features grant proficiency in the same thing. E.g. two class features both granting Perception proficiency still yield a single +prof.
- A feature that lets you **multiply** the bonus (Expertise ×2, Jack of All Trades ×½, always round down) multiplies it **once**, and only if the bonus applies at all. You cannot Expertise a check you aren't proficient in, and multipliers don't stack (use one).
- You add proficiency bonus only when proficient in the specific skill, save, weapon, tool, or when a rule says so (spell save DCs, spell attack rolls).

## Ability modifiers

Modifier = ⌊(score − 10) / 2⌋. (`API: /api/2014/ability-scores`)

| Score | Mod | Score | Mod | Score | Mod |
|---|---|---|---|---|---|
| 1 | −5 | 10–11 | +0 | 20–21 | +5 |
| 2–3 | −4 | 12–13 | +1 | 22–23 | +6 |
| 4–5 | −3 | 14–15 | +2 | 24–25 | +7 |
| 6–7 | −2 | 16–17 | +3 | 26–27 | +8 |
| 8–9 | −1 | 18–19 | +4 | 28–29 | +9 |
| | | | | 30 | +10 |

- Player characters cap at score **20** without magic; monsters and certain magic go to **30**.
- The modifier, not the score, is what appears in every roll formula.

## Typical Difficulty Classes

The DM sets the DC before the roll. Standard ladder:

| Task difficulty | DC |
|---|---|
| Very easy | 5 |
| Easy | 10 |
| Medium | 15 |
| Hard | 20 |
| Very hard | 25 |
| Nearly impossible | 30 |

Guidance: DC 10 is "an untrained commoner succeeds about half the time"; DC 15 is the workhorse mid-game DC; only set DC 5 if failure is still interesting, otherwise don't roll at all. If a task is impossible (persuade the king to abdicate on a whim), no roll — no DC makes it possible.

### When to call for a roll at all

Roll only when **all three** hold; otherwise narrate the outcome:

1. The outcome is **uncertain** (a locksmith picking a simple lock with no time pressure just succeeds).
2. **Failure has a cost or consequence** (time, noise, damage, a worse position).
3. The character **could plausibly succeed** (DC ≤ what their maximum roll can reach — otherwise it's automatic failure, no dice).

Repeated attempts: if nothing prevents retries and failure carries no cost, don't roll — the task takes longer (often ×10 time) and succeeds. A roll represents the attempt *under the circumstances that make it interesting*.

## Contests

A **contest** is two creatures rolling opposed ability checks; the higher total wins. Used when both sides actively oppose each other and there is no fixed DC.

- On a tie, **the situation remains as it was** (the status quo holds — e.g. neither wrestler gains the upper hand; the door stays shut).
- The two sides need not use the same ability: grappling is the grappler's Strength (Athletics) vs the target's **choice** of Strength (Athletics) or Dexterity (Acrobatics).
- Standard contests in the rules: grapple, shove, hiding (Dexterity (Stealth) vs Wisdom (Perception)), and escape from a grapple.

## Passive checks

A **passive check** is a check with no die roll: (`API: /api/2014/rule-sections/passive-checks`)

```
passive score = 10 + all modifiers that would apply to the active check
              (+5 if the check would have advantage, −5 if disadvantage)
```

- Used for (a) repeated tasks done "on average" (searching every door for traps) and (b) secret checks the DM doesn't want to telegraph (noticing a hidden creature).
- **Passive Perception** = 10 + Wis mod + prof (if proficient in Perception) is the floor for noticing hidden threats: a creature trying to hide must beat the passive Perception of any observer with its Stealth roll, or it is noticed.
- Passive scores are static: a passive check never "rolls low." A rogue with Observant-style bonuses and Expertise can have a passive Perception in the mid-20s at high level; that is intended.

## Group checks

When **several creatures attempt something together** and success is collective (sneaking as a party, navigating a swamp):

- Everyone rolls the check. If **at least half** the group succeeds, the whole group succeeds. Otherwise the whole group fails.
- Use group checks only when the skilled can plausibly cover for the unskilled. Do not use them when one failure gives everyone away *and* no one can compensate (then each failure matters individually — a DM judgment call).

## Working together and the Help action

- **Working together** (out of combat): one creature leads and rolls with **advantage**; the helper must be someone who could plausibly attempt the check alone (you can't help pick a lock if you have no idea how locks work — DM's call, commonly gated on tool/skill proficiency).
- Only **one** creature can help; more helpers add nothing (advantage doesn't stack).
- **Help action** (in combat): as an action, grant an ally advantage on its next ability check to do the task you're helping with, **or** grant advantage on the ally's next attack roll against a creature within 5 ft of you, provided the attack happens before the start of your next turn.

## Inspiration

- The DM awards **inspiration** for good roleplay, clever play, or engaging the character's traits. A character either **has it or doesn't** — it never stacks.
- Spend it when making an attack roll, saving throw, or ability check to gain **advantage** on that roll.
- A character with inspiration may **give it away** to another character as a reward for their play.

> **2024 note:** renamed Heroic Inspiration; spent to **reroll any die** (not grant advantage), and a natural 20 on a d20 Test grants it.

## Rounding

**Always round down** unless a rule explicitly says otherwise. Half of 7 is 3. Half a level is rounded down. This applies to Jack of All Trades (½ prof, round down), half damage on a save, halved speed, and every other fraction in the game.

## Specific beats general

When a specific rule contradicts a general rule, **the specific rule wins**, and only in its own scope.

- General: opportunity attacks trigger when you leave reach. Specific: the Disengage action says you provoke none this turn — Disengage wins.
- General: you can't cast two "real" spells on one turn... actually the real rule is specific: if you cast a spell as a **bonus action**, the only other spell you can cast that turn is a **cantrip with a casting time of 1 action**. The specific bonus-action-spell rule overrides the general action economy.
- Monster traits, class features, and spells routinely break general rules; that is by design, not errata.

## Rulings over rules

The DM is the referee: the written rules cannot cover every situation, and the DM's ruling at the table **is** the rule for that moment. For AI tooling this means:

- Present the RAW (rules as written) answer with its citation, then flag where a table ruling is commonly needed.
- Never present a popular house rule (flanking advantage, crit fumbles, drinking a potion as a bonus action) as RAW — label variants as variants.
- When the rules are genuinely silent, say so and suggest the closest analogous mechanic (usually an ability check against a DC from the ladder above).

## Resolution checklist (for AI tools)

Deterministic evaluation order for any d20 roll:

1. **Classify** the roll: check, attack, or save (this decides which features apply).
2. **Sum static modifiers**: ability mod + prof (if proficient, ×2 Expertise or ×½ JoAT where legal, once only) + flat bonuses (item, cover for AC on the defender's side).
3. **Collapse advantage state**: any adv? any dis? both/neither ⇒ 1d20; only adv ⇒ 2d20-keep-high; only dis ⇒ 2d20-keep-low.
4. **Roll**, then apply at most **one** reroll/replace feature to at most one die; the new result stands.
5. **Check naturals**: attack roll nat 20 ⇒ hit + crit; nat 1 ⇒ miss; death save 20/1 special; otherwise no special handling (2014).
6. **Compare** total vs DC/AC: ≥ succeeds.
7. **On a crit**: double the damage *dice* (not modifiers), then apply resistance/vulnerability last.

Round down at every fractional step. Never let two proficiency additions, two advantages, or two rerolls into the same roll.

## Common table rulings

**Q: A player has advantage from two sources and disadvantage from one. What do they roll?**
A: One plain d20. Any advantage + any disadvantage = straight roll, regardless of counts.

**Q: Does a natural 20 on an ability check automatically succeed?**
A: Not in the 2014 rules — a nat 20 Strength check still fails to lift the 5-ton portcullis if the total is under the DC. Auto-success on 20 applies only to attack rolls (and death saves). Many tables house-rule otherwise; label it a house rule.

**Q: Can two players both Help the rogue on one lockpicking check for "double advantage"?**
A: No. Advantage never stacks; the second helper contributes nothing mechanically.

**Q: The bard is proficient in Perception from two different sources. Do they add +prof twice?**
A: Never. Duplicate proficiency is wasted (many tables let the player pick a replacement skill when the duplication comes from background overlap — the SRD is silent; the Player's Handbook backgrounds suggest offering a swap).

**Q: Is initiative affected by things that boost ability checks?**
A: Yes. Initiative is a Dexterity check, so advantage on ability checks, bard Jack of All Trades, and similar features all apply.

**Q: Who wins a tied contest — say, tied grapple checks?**
A: Nobody; the situation stays as it was before the contest. The grapple attempt simply fails to change anything.

**Q: Can a character with Expertise apply it to a check they're not proficient in?**
A: No. Expertise doubles a proficiency bonus that is already being added; no proficiency, nothing to double.

**Q: The DC is 15 and the player rolls exactly 15. Success?**
A: Yes. Meeting the DC (or AC) is success — "meets it, beats it."
