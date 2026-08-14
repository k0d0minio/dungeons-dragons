# 11 — Quick Reference (DM Screen)

> Purpose: Pure lookup tables from SRD 5.1 (2014 rules) for an AI to quote verbatim mid-session — actions, conditions, DCs, formulas, and one-line answers to the twenty most common rules disputes.

## Actions in combat

| Action | One line |
|---|---|
| **Attack** | Make one melee or ranged attack (more with Extra Attack). |
| **Cast a Spell** | Cast a spell with a casting time of 1 action (`API: /api/2014/spells`). |
| **Dash** | Gain extra movement equal to your speed this turn. |
| **Disengage** | Your movement provokes no opportunity attacks this turn. |
| **Dodge** | Attacks against you have disadvantage; you make DEX saves with advantage (until start of your next turn; lost if incapacitated or speed 0). |
| **Help** | Give an ally advantage on their next check, or on their next attack vs. a creature within 5 ft. of you (before your next turn). |
| **Hide** | Make a Dexterity (Stealth) check to become unseen/unheard. |
| **Ready** | Choose a trigger + response; act on the trigger using your reaction. |
| **Search** | Make a Wisdom (Perception) or Intelligence (Investigation) check. |
| **Use an Object** | Interact with a second object (first interaction per turn is free). |
| **Grapple** | Replaces one attack: your Athletics vs. their Athletics *or* Acrobatics; target ≤ 1 size larger; success = grappled (speed 0). |
| **Shove** | Replaces one attack: same contest; success = knock prone *or* push 5 ft. |
| **Escape a grapple** | Your action: Athletics or Acrobatics vs. grappler's Athletics. |
| **Improvise** | Anything else — DM sets a DC. |

## What uses your reaction

One reaction per round, back at the **start of your turn**: **opportunity attack** (enemy leaves your reach using its movement); **readied action** (on trigger); reaction spells (*shield* when hit, *counterspell* when a spell is cast within 60 ft., *feather fall* when falling); class features (e.g. protection Fighting Style); monster reactions listed in the stat block.

## Conditions — one line each (`API: /api/2014/conditions`)

| Condition | Effect |
|---|---|
| **Blinded** | Auto-fail sight checks; attacks vs. you have advantage, yours have disadvantage. |
| **Charmed** | Can't attack the charmer or target it harmfully; charmer has advantage on social checks vs. you. |
| **Deafened** | Auto-fail hearing checks. |
| **Exhaustion** | 6 stacking levels — see one-liner below. |
| **Frightened** | Disadvantage on checks/attacks while source is in sight; can't willingly move closer to it. |
| **Grappled** | Speed 0, no bonus from any speed; ends if grappler is incapacitated or you're moved out of reach. |
| **Incapacitated** | No actions, no reactions (movement and speech still allowed). |
| **Invisible** | Heavily obscured for hiding; attacks vs. you disadvantage, yours advantage; you can still be heard/tracked. |
| **Paralyzed** | Incapacitated, can't move/speak; auto-fail STR & DEX saves; attacks vs. you advantage; hits within 5 ft. are crits. |
| **Petrified** | Turned to stone: incapacitated, unaware, weight ×10; resistance to all damage; immune to poison/disease; auto-fail STR & DEX saves; attacks vs. you advantage. |
| **Poisoned** | Disadvantage on attack rolls and ability checks. |
| **Prone** | Crawl (½ speed) or stand (½ your speed); your attacks disadvantage; melee vs. you advantage, ranged vs. you disadvantage. |
| **Restrained** | Speed 0; attacks vs. you advantage, yours disadvantage; disadvantage on DEX saves. |
| **Stunned** | Incapacitated, can't move, halting speech; auto-fail STR & DEX saves; attacks vs. you advantage. |
| **Unconscious** | Incapacitated, prone, drops everything, unaware; auto-fail STR & DEX saves; attacks vs. you advantage; hits within 5 ft. are crits. |

## Cover

| Cover | Effect |
|---|---|
| Half | +2 AC and +2 DEX saves |
| Three-quarters | +5 AC and +5 DEX saves |
| Total | Can't be targeted directly |

## Obscurement & light

| State | Effect |
|---|---|
| Lightly obscured (dim light, patchy fog, light foliage) | Disadvantage on Perception checks relying on sight |
| Heavily obscured (darkness, thick fog, dense foliage) | Vision blocked — treated as **blinded** for what's inside |
| Darkvision | Dim light counts as bright; darkness counts as dim (no color) |

## Typical DCs

| DC | 5 | 10 | 15 | 20 | 25 | 30 |
|---|---|---|---|---|---|---|
| Task | Very easy | Easy | Medium | Hard | Very hard | Nearly impossible |

## Skill → ability map (`API: /api/2014/skills`)

| STR | DEX | INT | WIS | CHA |
|---|---|---|---|---|
| Athletics | Acrobatics, Sleight of Hand, Stealth | Arcana, History, Investigation, Nature, Religion | Animal Handling, Insight, Medicine, Perception, Survival | Deception, Intimidation, Performance, Persuasion |

(CON has no skills; raw CON checks exist.)

## Ability score → modifier

| Score | 1 | 2–3 | 4–5 | 6–7 | 8–9 | 10–11 | 12–13 | 14–15 | 16–17 | 18–19 | 20–21 | 22–23 | 24–25 | 26–27 | 28–29 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mod | −5 | −4 | −3 | −2 | −1 | +0 | +1 | +2 | +3 | +4 | +5 | +6 | +7 | +8 | +9 | +10 |

Formula: `mod = floor((score − 10) / 2)`.

## Proficiency bonus — by level and by CR

| Level / CR | 1–4 | 5–8 | 9–12 | 13–16 | 17–20 | CR 21–24 | CR 25–28 | CR 29–30 |
|---|---|---|---|---|---|---|---|---|
| Bonus | +2 | +3 | +4 | +5 | +6 | +7 | +8 | +9 |

## Death saves

At 0 HP: roll d20 at the start of each of your turns. **10+** = success, **9−** = failure. **3 successes** = stable; **3 failures** = dead. **Nat 1** = two failures; **nat 20** = regain 1 HP, up and conscious. **Any damage while at 0 HP** = one failure (crit = two; melee hits within 5 ft. are auto-crits vs. unconscious). Damage that reduces you to 0 with excess ≥ your HP maximum = **instant death**. Successes/failures reset to 0 on regaining any HP or becoming stable.

## Concentration

- Triggers a check: **taking damage** (one save per damage instance).
- Save: **CON save, DC = max(10, ⌊damage / 2⌋)**.
- Ends automatically: casting another concentration spell, being **incapacitated**, dying. DM option: DC 10 CON save for violent environment (wave, heavy jostle).
- You can concentrate on only **one** spell at a time; ending it costs nothing and can be done anytime.

## Resting

| Rest | Length | Restores |
|---|---|---|
| **Short** | ≥ 1 hour | Spend Hit Dice to heal (roll HD + CON mod each); short-rest features (warlock slots, etc.) |
| **Long** | ≥ 8 hours (≤ 2 hrs light activity, one per 24 hrs, need ≥ 1 HP to benefit) | All HP; half your total Hit Dice (min 1); all spell slots; long-rest features; −1 exhaustion level |

## Travel pace

| Pace | Per minute | Per hour | Per day | Effect |
|---|---|---|---|---|
| Fast | 400 ft. | 4 miles | 30 miles | −5 passive Perception |
| Normal | 300 ft. | 3 miles | 24 miles | — |
| Slow | 200 ft. | 2 miles | 18 miles | Can use Stealth |

Forced march: beyond 8 hours/day, CON save DC 10 + 1 per extra hour or gain 1 exhaustion.

## Light sources (`API: /api/2014/equipment`)

| Source | Bright | Dim | Duration |
|---|---|---|---|
| Candle | 5 ft. | +5 ft. | 1 hr |
| Torch | 20 ft. | +20 ft. | 1 hr |
| Lamp | 15 ft. | +30 ft. | 6 hrs/flask |
| Hooded lantern | 30 ft. | +30 ft. | 6 hrs/flask (hooded: dim 5 ft.) |
| Bullseye lantern | 60-ft cone | +60 ft. | 6 hrs/flask |
| *Light* cantrip | 20 ft. | +20 ft. | 1 hr |

## Falling, suffocation, exhaustion

- **Falling:** 1d6 bludgeoning per 10 ft. fallen, max 20d6; land prone unless damage avoided.
- **Holding breath:** 1 + CON mod minutes (min 30 seconds). **Out of air:** survive CON mod rounds (min 1), then drop to 0 HP and start dying; no healing/stabilizing until you can breathe.
- **Exhaustion levels:** 1 disadvantage on ability checks → 2 speed halved → 3 disadvantage on attacks & saves → 4 HP max halved → 5 speed 0 → 6 death. Long rest with food/water removes one level.

## Damage types

| Type | Examples | Type | Examples |
|---|---|---|---|
| Acid | ooze, corrosive breath | Necrotic | life-drain, wither |
| Bludgeoning | club, fall, slam | Piercing | arrow, bite, spear |
| Cold | icy breath, frost ray | Poison | venom, poison gas |
| Fire | burning oil, red dragon breath | Psychic | mental assault |
| Force | *magic missile*, pure magic | Radiant | *sacred flame*, holy energy |
| Lightning | *lightning bolt*, blue dragon breath | Slashing | sword, axe, claw |
| Thunder | *thunderwave*, concussive blast | | |

## Spell slots — full casters (levels 1–20)

| Lvl | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2 | – | – | – | – | – | – | – | – |
| 2 | 3 | – | – | – | – | – | – | – | – |
| 3 | 4 | 2 | – | – | – | – | – | – | – |
| 4 | 4 | 3 | – | – | – | – | – | – | – |
| 5 | 4 | 3 | 2 | – | – | – | – | – | – |
| 6 | 4 | 3 | 3 | – | – | – | – | – | – |
| 7 | 4 | 3 | 3 | 1 | – | – | – | – | – |
| 8 | 4 | 3 | 3 | 2 | – | – | – | – | – |
| 9 | 4 | 3 | 3 | 3 | 1 | – | – | – | – |
| 10 | 4 | 3 | 3 | 3 | 2 | – | – | – | – |
| 11–12 | 4 | 3 | 3 | 3 | 2 | 1 | – | – | – |
| 13–14 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | – | – |
| 15–16 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | – |
| 17 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | 1 |
| 18 | 4 | 3 | 3 | 3 | 3 | 1 | 1 | 1 | 1 |
| 19 | 4 | 3 | 3 | 3 | 3 | 2 | 1 | 1 | 1 |
| 20 | 4 | 3 | 3 | 3 | 3 | 2 | 2 | 1 | 1 |

(Half-casters: paladin/ranger use `⌈level/2⌉` on this table; warlock uses Pact Magic instead.)

## XP by character level

| Lvl | XP | Lvl | XP | Lvl | XP | Lvl | XP |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 6 | 14,000 | 11 | 85,000 | 16 | 195,000 |
| 2 | 300 | 7 | 23,000 | 12 | 100,000 | 17 | 225,000 |
| 3 | 900 | 8 | 34,000 | 13 | 120,000 | 18 | 265,000 |
| 4 | 2,700 | 9 | 48,000 | 14 | 140,000 | 19 | 305,000 |
| 5 | 6,500 | 10 | 64,000 | 15 | 165,000 | 20 | 355,000 |

## Encounter thresholds (per character, compact)

| Lvl | E/M/H/D | Lvl | E/M/H/D |
|---|---|---|---|
| 1 | 25/50/75/100 | 11 | 800/1600/2400/3600 |
| 2 | 50/100/150/200 | 12 | 1000/2000/3000/4500 |
| 3 | 75/150/225/400 | 13 | 1100/2200/3400/5100 |
| 4 | 125/250/375/500 | 14 | 1250/2500/3800/5700 |
| 5 | 250/500/750/1100 | 15 | 1400/2800/4300/6400 |
| 6 | 300/600/900/1400 | 16 | 1600/3200/4800/7200 |
| 7 | 350/750/1100/1700 | 17 | 2000/3900/5900/8800 |
| 8 | 450/900/1400/2100 | 18 | 2100/4200/6300/9500 |
| 9 | 550/1100/1600/2400 | 19 | 2400/4900/7300/10900 |
| 10 | 600/1200/1900/2800 | 20 | 2800/5700/8500/12700 |

Multipliers by monster count: 1 → ×1 · 2 → ×1.5 · 3–6 → ×2 · 7–10 → ×2.5 · 11–14 → ×3 · 15+ → ×4. Full method in `10-dm-guide.md`.

## Jump & carry

- **Long jump:** STR *score* in feet with a 10-ft. run-up; half standing.
- **High jump:** 3 + STR *mod* feet with a 10-ft. run-up; half standing. Reach up = height + half your height.
- **Carrying capacity:** STR × 15 lb. **Push/drag/lift:** STR × 30 lb (speed drops to 5 ft. while exceeding carry).
- Size: ×2 per size category above Medium; Tiny ×½.

## Common formulas

```
AC (no armor)        = 10 + DEX mod
AC (light armor)     = armor base + DEX mod
AC (medium armor)    = armor base + DEX mod (max +2)
AC (heavy armor)     = armor base (STR minimum applies)
Unarmored Defense    = 10 + DEX + CON (barbarian) | 10 + DEX + WIS (monk)
Spell save DC        = 8 + proficiency bonus + casting ability mod
Spell attack bonus   = proficiency bonus + casting ability mod
Weapon attack bonus  = proficiency bonus (if proficient) + STR or DEX mod
Passive score        = 10 + all modifiers to the check (+5 advantage / −5 disadvantage)
HP at level 1        = hit die max + CON mod
HP per later level   = roll or fixed average (d6→4, d8→5, d10→6, d12→7) + CON mod
Initiative           = d20 + DEX mod
```

## Rules disputes: 20 fast answers

1. **Hiding mid-combat** — allowed with the Hide action if you're unseen (heavily obscured, total cover, or a class feature); you can't hide from a creature that can see you clearly ("Unseen Attackers and Targets", PH combat rules).
2. **Drinking a potion** — an action ("Use an Object"); administering one to someone else is also an action. > **2024 note:** the 2024 rules make drinking a potion a **bonus action**.
3. **Stealth vs. passive Perception** — a hider rolls Stealth once when hiding; compare it to observers' **passive** Perception unless someone actively Searches (then contest the roll).
4. ***Shield* vs. *magic missile*** — *shield* works: it grants +5 AC **and explicitly blocks all *magic missile* darts** for the round (spell text).
5. **Opportunity attacks on forced movement** — **no**. OAs trigger only when a creature moves using its own movement, action, or reaction; being pushed, pulled, or teleported never provokes (PH "Opportunity Attacks").
6. **Flanking** — **not a core rule**; it's an optional DMG variant granting advantage. If the table hasn't opted in, it doesn't exist.
7. **Readying a spell** — casting a readied spell requires casting it now and **holding it with concentration** until the trigger; holding it ends any spell you were already concentrating on, and losing concentration wastes the slot (PH "Ready").
8. **Twinning cantrips** — a sorcerer can twin any spell that targets **one creature** and isn't self-range; qualifying cantrips cost **1 sorcery point** (spells of level 0 count as 1 for Twinned Spell).
9. **Sneak Attack frequency** — once per **turn**, not per round: a reaction attack (e.g. opportunity attack) on someone else's turn can trigger a second Sneak Attack in the same round.
10. **Darkness + darkvision** — darkvision makes darkness merely **dim light** (lightly obscured: disadvantage on sight-based Perception), not daylight; magical darkness defeats normal darkvision entirely.
11. **Two-weapon fighting** — the bonus-action off-hand attack requires both weapons to be **light** melee weapons and you must have taken the **Attack action**; no ability modifier to the off-hand damage unless negative (or you have the Two-Weapon Fighting style). One bonus action per turn, full stop.
12. **Counterspelling counterspell** — legal: another caster can use their reaction to *counterspell* the *counterspell*, saving the original spell. Each caster needs their own reaction.
13. **Healing an unconscious ally** — any healing (even 1 HP) brings them conscious and **resets death save successes and failures to zero**.
14. **Critical hits** — double the **dice only** (all damage dice, including Sneak Attack and *smite* dice), never the flat modifiers.
15. **Resistance stacking** — **never**: multiple sources of resistance to a damage type still halve once; resistance and vulnerability cancel out. Order: apply resistance/vulnerability **after** all other modifiers.
16. **Surprise** — not an extra round: surprised creatures are simply unable to move or act (and can't react) during their **first turn** of a normal initiative order. > **2024 note:** 2024 replaces this with disadvantage on the surprised creature's initiative roll.
17. **Prone shooter** — a prone attacker has **disadvantage** on attack rolls (melee and ranged); ranged attacks *against* a prone target also have disadvantage (melee against prone has advantage).
18. **Unseen attacker** — attacking from unseen grants **advantage**; attacking a target you can't see imposes **disadvantage**; the two cancel if both apply. You give away your location when you attack, hidden or not.
19. **Breaking a grapple by movement** — a grapple ends automatically if the grappled creature is removed from the grappler's reach by **any effect** — teleportation, *thunderwave* push, etc. No check needed.
20. **Help action requirements** — you must actually be able to help: the task must be one you *could* attempt alone (or assist plausibly), and Help-on-attack requires you to be **within 5 feet of the target**. The DM may refuse Help where a second pair of hands adds nothing.
