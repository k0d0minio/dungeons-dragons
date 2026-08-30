# 07 — Conditions

> Purpose: the exact mechanical effects of all 15 conditions on the 2024 rules (SRD 5.2.1), plus the interactions and stacking rules a DM actually needs mid-combat.

## General rules for conditions

- A condition lasts until its cause says it ends (duration, save, remover effect).
- **Conditions don't stack with themselves.** Two instances of the same condition do not compound; each has its own end trigger, but the effects apply once. **Exhaustion is the exception** — its levels add up.
- Different conditions apply at the same time and all of their effects apply. Unconscious carries Incapacitated and Prone with it.
- Where one effect grants Advantage and another Disadvantage on the same roll, they cancel. See `01-core-mechanics.md`.

## The 15 conditions

### Blinded

- You **can't see**, and you automatically fail any ability check that requires sight.
- Attack rolls against you have **Advantage**, and your attack rolls have **Disadvantage**.
- Commonly inflicted by: darkness against a creature with no darkvision, the Blindness/Deafness spell, a face full of sand.
- Blinded does not stop you moving, acting or casting. It costs you sight, not your turn.

### Charmed

- You **can't attack the charmer** or target them with a damaging ability or magical effect.
- The charmer has **Advantage** on any ability check to interact with you socially.
- That is the whole condition. A charmed character can still walk away, attack the charmer's allies, and warn the party — being charmed is not being controlled.
- Commonly inflicted by: Charm Person, a vampire's gaze, a fey bargain.

### Deafened

- You **can't hear**, and you automatically fail any ability check that requires hearing.
- Nothing else. Deafened does not affect attacks or saves.
- It does stop you casting spells with a **verbal** component if you also cannot speak — but deafness alone does not silence you.

### Exhaustion

The single biggest simplification in the 2024 rules. Exhaustion is now one scaling number rather than a ladder of separate effects.

- The condition is **cumulative**. Each time you receive it, you gain 1 **Exhaustion level**.
- **Every D20 Test is reduced by 2 × your Exhaustion level.** Attack rolls, ability checks, saving throws, initiative and passive scores all take it.
- **Your Speed is reduced by 5 feet × your Exhaustion level.**
- At **level 6 you die**.
- Finishing a **Long Rest** removes one level. At 0 the condition ends.

| Exhaustion level | D20 Tests | Speed |
|---|---|---|
| 1 | −2 | −5 ft |
| 2 | −4 | −10 ft |
| 3 | −6 | −15 ft |
| 4 | −8 | −20 ft |
| 5 | −10 | −25 ft |
| 6 | Death | Death |

> **Changed from 2014:** the old six-step ladder — Disadvantage on checks, then half Speed, then Disadvantage on attacks and saves, then halved hit point maximum, then Speed 0, then death — is gone. One number, applied everywhere, is easier to run and hurts sooner: a single level is already a −2 on everything.

Commonly inflicted by: a forced march, going without food or water, extreme cold, some magic. Note that several 2014 features that handed out exhaustion — the berserker barbarian's Frenzy among them — no longer do.

### Frightened

- You have **Disadvantage on ability checks and attack rolls** while the source of the fear is within line of sight.
- You **can't willingly move closer** to the source.
- Break line of sight and the Disadvantage stops, though the condition itself continues until its own end trigger.

### Grappled

- Your **Speed is 0** and can't be increased.
- You have **Disadvantage on attack rolls** against any target other than the grappler.
- The grappler can **drag or carry you**, but every foot of that movement costs it 1 extra foot unless you are Tiny or at least two sizes smaller than it.
- **Ending it**: take an action to make a Strength (Athletics) or Dexterity (Acrobatics) check against the grappler's escape DC. It also ends if the grappler is Incapacitated, or if something moves you out of the grappler's reach.

> **Changed from 2014:** Grappled is now inflicted by an Unarmed Strike that forces a saving throw, and it comes with Disadvantage on attacks against anyone but the grappler — a real cost, where the 2014 condition only pinned you in place.

### Incapacitated

The load-bearing condition: several others include it.

- You **can't take any action, Bonus Action or Reaction**.
- Your **Concentration is broken**.
- You **can't speak**.
- If you're Incapacitated when you roll initiative, you have **Disadvantage** on the roll.
- You can still move, unless something else stops you.

### Invisible

- If you're Invisible when you roll initiative, you have **Advantage** on the roll.
- You are **concealed**: nothing that requires its target to be seen affects you, unless its creator can somehow see you. Your equipment is concealed too.
- Attack rolls against you have **Disadvantage**, and your attack rolls have **Advantage** — but not against a creature that can somehow see you.

> **Changed from 2014:** this is the condition the **Hide** action now gives you, so "hidden" and "invisible" are one mechanic instead of two. It also means the Invisibility spell and a successful Stealth check produce exactly the same game state.

### Paralyzed

- You have the **Incapacitated** condition.
- Your **Speed is 0** and can't increase.
- You **automatically fail Strength and Dexterity saving throws**.
- Attack rolls against you have **Advantage**.
- **Any attack that hits you is a Critical Hit if the attacker is within 5 feet.**

### Petrified

- You are turned, along with your nonmagical possessions, into a solid inanimate substance — usually stone. Your weight increases tenfold and you stop ageing.
- You have the **Incapacitated** condition and your **Speed is 0**.
- Attack rolls against you have **Advantage**.
- You **automatically fail Strength and Dexterity saving throws**.
- You have **Resistance to all damage** and **Immunity to the Poisoned condition**.

### Poisoned

- You have **Disadvantage on attack rolls and ability checks**.
- Nothing else. Poisoned does not touch saving throws, so a poisoned caster's Concentration saves are unaffected.

### Prone

- Your only movement options are to **crawl**, or to spend **half your Speed** (rounded down) righting yourself, which ends the condition. With Speed 0 you cannot get up at all.
- Your attack rolls have **Disadvantage**.
- An attack roll against you has **Advantage if the attacker is within 5 feet**, and **Disadvantage otherwise**.
- Dropping Prone costs nothing. It is a real tactic against archers.

### Restrained

- Your **Speed is 0** and can't increase.
- Attack rolls against you have **Advantage**, and your attack rolls have **Disadvantage**.
- You have **Disadvantage on Dexterity saving throws**.

### Stunned

- You have the **Incapacitated** condition.
- You **automatically fail Strength and Dexterity saving throws**.
- Attack rolls against you have **Advantage**.

### Unconscious

- You have the **Incapacitated** and **Prone** conditions, and you **drop whatever you are holding**. When the condition ends you are still Prone.
- Your **Speed is 0** and can't increase.
- Attack rolls against you have **Advantage**.
- You **automatically fail Strength and Dexterity saving throws**.
- **Any attack that hits you is a Critical Hit if the attacker is within 5 feet.**
- You are **unaware of your surroundings**.
- Commonly inflicted by: dropping to 0 hit points, being knocked out on the blow that would have dropped you, sleep magic.

## Condition overlap and stacking summary

| Condition | Includes Incapacitated? | Breaks Concentration? | Attacks against it | Its own attacks | Auto-fails STR and DEX saves? |
|---|---|---|---|---|---|
| Blinded | No | No | Advantage | Disadvantage | No |
| Charmed | No | No | — | Can't target the charmer | No |
| Deafened | No | No | — | — | No |
| Exhaustion | No | No | — | −2 per level | No, but −2 per level |
| Frightened | No | No | — | Disadvantage while the source is in sight | No |
| Grappled | No | No | — | Disadvantage against anyone but the grappler | No |
| Incapacitated | Itself | **Yes** | — | None possible | No |
| Invisible | No | No | Disadvantage | **Advantage** | No |
| Paralyzed | **Yes** | **Yes** | Advantage, crit within 5 ft | None possible | **Yes** |
| Petrified | **Yes** | **Yes** | Advantage | None possible | **Yes** |
| Poisoned | No | No | — | Disadvantage | No |
| Prone | No | No | Advantage within 5 ft, Disadvantage beyond | Disadvantage | No |
| Restrained | No | No | Advantage | Disadvantage | No, but Disadvantage on DEX saves |
| Stunned | **Yes** | **Yes** | Advantage | None possible | **Yes** |
| Unconscious | **Yes** | **Yes** | Advantage, crit within 5 ft | None possible | **Yes** |

Cross-cutting facts worth having to hand:

- **Concentration** also breaks on casting another Concentration spell, on failing the Constitution save after damage, and on death. The column above covers only the condition-driven break, which is every condition that carries Incapacitated.
- **The automatic Critical Hit within 5 feet** exists on exactly two conditions: Paralyzed and Unconscious.
- **Speed 0** comes from Grappled, Restrained, Paralyzed, Petrified, Stunned and Unconscious. You cannot stand from Prone with Speed 0.
- **Exhaustion is the only condition that is a number**, and the only one that touches every roll you make.
- A stat block's **condition immunity** blocks the condition entirely, from any source — a spell, a grapple, or the environment.

## What removes or suppresses conditions

| Remover | Clears |
|---|---|
| **Lesser Restoration** | One of Blinded, Deafened, Paralyzed or Poisoned, or one disease |
| **Greater Restoration** | One of: one Exhaustion level, Charmed, Petrified, a curse, an ability score reduction, or a hit point maximum reduction |
| **Calm Emotions** | Suppresses Charmed and Frightened for the duration; they resume afterwards if time remains |
| **Freedom of Movement** | Magic can't reduce your Speed or give you Paralyzed or Restrained; you escape a Grapple with 5 feet of movement; difficult terrain does not slow you |
| **Heal** | Ends Blinded and Deafened and any disease, alongside the healing |
| **A Long Rest** | One Exhaustion level. Most short conditions have expired long before |
| **Paladin's Lay On Hands** | The Poisoned condition, for 5 points from the pool; from level 14 also Blinded, Charmed, Deafened, Frightened, Paralyzed or Stunned |
| **A monk's Self-Restoration** | Charmed, Frightened or Poisoned, on the monk, at the end of each of its turns from level 10 |
| **A repeated save** | Only where the effect grants one. There is no universal retry rule |
| **The source ending** | A Grapple ends when the grappler is Incapacitated; a Concentration-based condition ends when the caster's Concentration breaks |

## Duration patterns

Every condition fits one of five shapes. Knowing which one tells you what to write on the initiative tracker.

1. **Timed** — a fixed duration with no retry. Track when it ends.
2. **Save-ended** — a repeated save at the end of the target's turns. Track the DC, the ability, and when the retry comes.
3. **Until removed** — it persists until something specific lifts it. Petrified is the classic. Track what will lift it.
4. **Condition-linked** — derived from another state and ending with it. Prone until you stand, Unconscious until you are above 0, Grappled until you escape. Track the parent state.
5. **Levelled** — Exhaustion only. A number from 0 to 6, never a yes or no.

## Common table rulings

**Q: Restrained and Prone at once, and the attacker is 30 feet away. What do they roll?**
A: One plain d20. Restrained gives Advantage, Prone at range gives Disadvantage, and they cancel. An adjacent attacker would have Advantage from both, which is still just Advantage.

**Q: Does the Poisoned condition affect saving throws?**
A: No — attack rolls and ability checks only. A poisoned caster's Concentration saves are untouched.

**Q: How much does one level of Exhaustion actually cost?**
A: −2 on every d20 you roll and 5 feet of Speed. It is much harsher than the old first level, which only touched ability checks, and it hits attacks and saves from the start.

**Q: Ranged attack against a Paralyzed target from 60 feet — automatic crit?**
A: No. That needs the attacker to be within 5 feet. From range it is just Advantage, though the target still auto-fails any Strength or Dexterity save the attack forces.

**Q: My grappler got Stunned. Does the Grapple hold?**
A: No. Stunned includes Incapacitated, and a Grapple ends when the grappler is Incapacitated. The target is free immediately.

**Q: Can a Charmed character walk away or attack the charmer's allies?**
A: Both. Charmed forbids attacking or harming **the charmer** and hands them social Advantage. Anything more is a different effect that says so.

**Q: I hid successfully. Am I invisible, really?**
A: Yes — mechanically identical. You have the Invisible condition until you make a noise, attack, cast with a verbal component, or someone finds you with the Search action.

**Q: Invisible attacker against a defender with blindsight?**
A: Neither has the edge inside the blindsight range. The sense sees through it, so no Advantage and no Disadvantage.

**Q: A melee hit on an unconscious character at 0 hit points — what happens?**
A: Within 5 feet it is an automatic Critical Hit, and damage at 0 hit points is a death save failure — **two** for a crit. One more and they are dead. If the damage is at least their hit point maximum, they die outright regardless of the counters.

**Q: Two creatures Paralyze the fighter on consecutive rounds. Two conditions?**
A: Two instances, one effect. The fighter is Paralyzed once mechanically but has to clear each instance, each with its own save, before the condition lifts. Only Exhaustion deepens.
