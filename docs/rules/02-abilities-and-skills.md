# 02 — Abilities, Skills & Derived Numbers

> Purpose: exact SRD 5.1 (2014) rules for the six ability scores, the 18 skills, tool proficiencies, and every number derived from an ability score, so tools and tables compute them identically.

## The six ability scores

Every creature has all six. Each score (1–30, PC cap 20 without magic) yields a modifier — see the modifier table in `01-core-mechanics.md`. (`API: /api/2014/ability-scores`)

### Generating scores

Two standard methods (DM chooses which the table uses):

| Method | Rule |
|---|---|
| **Standard array** | Assign 15, 14, 13, 12, 10, 8 to the six abilities in any order |
| **Point buy** | 27 points; every score starts at 8 |
| (Rolled) | 4d6, drop the lowest die, six times, assign freely — swingy; common but not the baseline |

Point-buy costs (before racial bonuses; scores outside 8–15 can't be bought):

| Score | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|
| Cost | 0 | 1 | 2 | 3 | 4 | 5 | 7 | 9 |

Ability Score Improvements (class feature, typically levels 4/8/12/16/19): +2 to one score or +1 to two, cap 20.

| Ability | Governs | Typical checks (no skill applies) |
|---|---|---|
| **Strength (STR)** | Raw physical power; melee attack/damage with most weapons; carrying | Force a stuck door, bend bars, hold a portcullis up, break bonds |
| **Dexterity (DEX)** | Agility, reflexes, balance; AC; initiative; finesse/ranged attacks | Squeeze through a tight space (raw), fine manual control of a wagon, pick a pocket → usually Sleight of Hand |
| **Constitution (CON)** | Endurance, health, hit points; no skills use it | Hold breath beyond the limit, march past a forced-march threshold, go without sleep, drink the whole ale barrel |
| **Intelligence (INT)** | Memory, reasoning, learned knowledge | Recall a fact no skill covers, estimate a count at a glance, appraise value, forgery without the tool |
| **Wisdom (WIS)** | Awareness, intuition, perceptiveness | Gut read of a situation not covered by Insight, notice something → usually Perception |
| **Charisma (CHA)** | Force of personality, social command | Blend into a crowd, command attention, first-impression checks not covered by a skill |

## The 18 skills

A **skill proficiency** means: add your proficiency bonus when a check uses that skill. Skills belong to checks only — never to attacks or saves. (`API: /api/2014/skills`)

| Skill | Default ability | Use when… |
|---|---|---|
| **Acrobatics** | DEX | Keeping footing: balance on a ledge, land a fall, tumble past, escape a grapple (defender's option) |
| **Animal Handling** | WIS | Calming, controlling, or reading a non-monstrous animal; risky mount maneuvers |
| **Arcana** | INT | Recalling lore about spells, magic items, planes, magical traditions and symbols |
| **Athletics** | STR | Climbing, jumping farther/higher than the automatic distance, swimming in rough water, grappling and shoving |
| **Deception** | CHA | Convincing someone of a falsehood — lies, disguise-backed bluffs, con jobs, misleading body language |
| **History** | INT | Recalling lore about past events, legendary people, wars, kingdoms, lost civilizations |
| **Insight** | WIS | Reading a creature's true intent: detecting lies, predicting the next move from body language |
| **Intimidation** | CHA | Influencing through threats, hostility, or displayed menace |
| **Investigation** | INT | Deducing from clues: searching a room by reasoning, finding a hidden mechanism's workings, analyzing a wound |
| **Medicine** | WIS | Stabilizing a dying creature (DC 10), diagnosing illness |
| **Nature** | INT | Recalling lore about terrain, plants, animals, weather, natural cycles |
| **Perception** | WIS | Noticing with the senses: spotting the hidden creature, hearing steps, smelling smoke |
| **Performance** | CHA | Entertaining an audience — music, dance, oratory, acting |
| **Persuasion** | CHA | Influencing in good faith: diplomacy, etiquette, honest requests |
| **Religion** | INT | Recalling lore about deities, rites, holy symbols, cults, religious hierarchies |
| **Sleight of Hand** | DEX | Manual trickery: planting or lifting an object, palming, concealing on the body |
| **Stealth** | DEX | Concealing yourself: hiding, moving silently, slipping past guards |
| **Survival** | WIS | Tracking, hunting, foraging, navigating wilderness, predicting weather, avoiding natural hazards |

By ability: STR 1 skill (Athletics) · DEX 3 · CON 0 · INT 5 · WIS 5 · CHA 4.

### Athletics vs Acrobatics (the physical-skill confusion)

- **Athletics (STR)** = power against resistance: climb the cliff, swim the current, jump farther, grapple, shove, break the hold.
- **Acrobatics (DEX)** = balance and body control: stay upright on ice, walk the tightrope, tumble, land the fall, slip *out* of a grab.
- Escaping a grapple is the one place the defender picks either; initiating a grapple or shove is **always** Athletics.
- Climbing and swimming don't normally require checks at all — they cost movement (see below); a check enters only for slippery/sheer surfaces or rough water.

### Ability-linked movement costs

| Mode | Cost (no special speed) | Check needed when… |
|---|---|---|
| Climb | 1 ft costs 2 ft of speed | Slippery, sheer, or handhold-poor — STR (Athletics) |
| Swim | 1 ft costs 2 ft | Rough water — STR (Athletics) |
| Crawl | 1 ft costs 2 ft | — (3 ft in difficult terrain) |
| Difficult terrain | 1 ft costs 2 ft | Stacks with the above (climbing difficult terrain: 1 ft costs 3 ft) |

### Variant: skills with different abilities

The listed ability is the **default**, not a law. The DM may pair any skill with any ability when the fiction fits, keeping the proficiency:

- Swim a long distance → **Constitution (Athletics)**.
- Intimidate through sheer physical menace → **Strength (Intimidation)**.
- Recall drilled-in naval protocol under pressure → the DM names the pairing.

Rule: the DM announces the pairing; if the character is proficient in the skill, proficiency bonus applies regardless of which ability is used.

### Perception vs Investigation (the classic confusion)

- **Perception (WIS)** = noticing with the senses. "Do I see/hear/smell it?"
- **Investigation (INT)** = deducing from evidence. "What do these clues mean? Where would the lever be?"
- Finding a hidden door by spotting the scuff marks: Perception. Working out how it opens: Investigation. Either can find a trap depending on whether it's spotted or deduced — the DM picks based on the player's described approach.

## Tool proficiencies

A **tool proficiency** lets you add proficiency bonus to ability checks made *using that tool*. Differences from skills: (`API: /api/2014/equipment-categories/tools`)

| | Skill | Tool |
|---|---|---|
| Fixed ability? | Has a default ability | No default — DM pairs any ability with the tool per task |
| Needs equipment? | No | Yes — no tool in hand, no tool check (usually) |
| Examples | Stealth, Arcana | Thieves' tools, smith's tools, herbalism kit, disguise kit, gaming sets, vehicles |

- Thieves' tools are the canonical case: picking a lock is typically **Dexterity (thieves' tools)** — it is *not* a Sleight of Hand check.
- **Tool + skill synergy** (from the tool rules expansion, widely used): when both a relevant tool proficiency and a relevant skill proficiency apply to one check, grant **advantage** — you still add proficiency once, never twice. E.g. proficiency in both the herbalism kit and Nature when identifying a plant.

## Strength in depth

### Carrying capacity

| Quantity | Formula | Example (STR 15) |
|---|---|---|
| **Carrying capacity** | STR score × 15 lb | 225 lb |
| **Push / drag / lift** | STR score × 30 lb (while pushing/dragging over capacity, speed drops to 5 ft) | 450 lb |
| Size scaling | Large ×2, Huge ×4, Gargantuan ×8; **Tiny ×½** | — |

### Variant: encumbrance

If the table uses the encumbrance variant (off by default):

| Load carried | State | Effect |
|---|---|---|
| > STR × 5 lb | **Encumbered** | Speed −10 ft |
| > STR × 10 lb | **Heavily encumbered** | Speed −20 ft; disadvantage on ability checks, attack rolls, and saving throws that use STR, DEX, or CON |
| > STR × 15 lb | Over capacity | Can't carry it |

### Jumping

Jump distances are automatic — no check — up to these limits, and cost movement foot-for-foot:

| Jump | With 10 ft run-up | From standing |
|---|---|---|
| **Long jump** | STR **score** in feet | half that |
| **High jump** | 3 + STR **modifier** feet | half that |

- Long jump uses the raw **score** (STR 15 → 15 ft); high jump uses the **modifier** (STR 15 → 3 + 2 = 5 ft).
- You can reach up 1.5 × your height above you during a high jump.
- Exceeding the limit, clearing an obstacle, or landing in difficult terrain calls for a Strength (Athletics) or Dexterity (Acrobatics) check per the DM.

## Dexterity in depth

- **Initiative** = a Dexterity ability check rolled at the start of combat; order is highest first, DM breaks monster-vs-PC ties (players decide ties among themselves).
- **Armor Class**: unarmored AC = 10 + DEX mod. Light armor: armor base + full DEX mod. Medium armor: base + DEX mod (max +2). Heavy armor: base only, DEX ignored (min STR requirements apply or speed −10 ft).
- DEX governs the most-rolled save in the game (area damage: fireballs, breath weapons, traps).

## Constitution in depth

- **Hit points**: at level 1, max of the class Hit Die + CON mod; each later level, one roll (or the fixed average) + CON mod, minimum 1 HP gained per level. Retroactive: raising CON mod raises max HP by +1 per character level.
- **Concentration saves**: taking damage while concentrating on a spell forces a CON save, DC = max(10, ⌊damage ÷ 2⌋). One save per damage instance.
- **Holding breath**: 1 + CON mod **minutes** (minimum 30 seconds). When breath runs out (or when choking), you survive CON mod rounds (minimum 1), then drop to 0 HP at the start of your next turn and are dying; no HP regained until you can breathe.
- No skills key off CON; CON checks are raw (endurance feats, forced marches, holding drink).

## INT vs WIS vs CHA — decision guide

The most common miscall at tables. Ask what the character is *doing*, not what result they want:

| The character is… | Roll |
|---|---|
| Recalling something learned or studied | **INT** (Arcana/History/Nature/Religion) |
| Noticing something with the senses right now | **WIS (Perception)** |
| Judging whether someone is lying or what they intend | **WIS (Insight)** |
| Telling a lie convincingly | **CHA (Deception)** |
| Making an honest, reasoned appeal | **CHA (Persuasion)** |
| Cowing someone with threats | **CHA (Intimidation)** — or STR (Intimidation) variant |
| Piecing together what clues imply | **INT (Investigation)** |
| Intuiting danger or "something feels wrong" | **WIS** (often Insight or raw) |

Anchors:

- INT = **library**, WIS = **senses and gut**, CHA = **projection at others**.
- Detecting a lie is WIS (Insight); constructing one is CHA (Deception); the two are the natural contest.
- Knowledge of *what a symbol means* is INT (Religion); noticing *the symbol on the assassin's ring* is WIS (Perception).
- Social checks target the *listener's disposition*; no roll makes the impossible possible (see DC guidance in `01-core-mechanics.md`).

## Passive Perception in depth

```
passive Perception = 10 + WIS mod + prof (if proficient) [+5 adv / −5 dis on relevant Perception checks]
```

- It is the **always-on floor** for noticing hidden things: a hiding creature is automatically noticed by any creature whose passive Perception ≥ the Stealth total.
- The DM compares silently — no player roll, no telegraph. An active "I search" roll can still be made; use the higher of active result vs passive floor is a common (house) convenience, but RAW the DM simply picks which applies.
- Modifiers flow through: disadvantage on Perception checks (e.g. from lightly obscured areas for sight, or the deafened condition for hearing) = −5 passive; advantage = +5.
- Dim light imposes disadvantage on sight-based Perception checks ⇒ −5 passive Perception for sight while in dim light.

## Saving throw proficiencies by class

Each class grants exactly two save proficiencies (one "strong" save from CON/DEX/WIS, one "weak" from STR/INT/CHA). Multiclassing grants save proficiencies only from your **first** class. (`API: /api/2014/classes/{class}` → `saving_throws`)

| Class | Saving throws |
|---|---|
| Barbarian | STR, CON |
| Bard | DEX, CHA |
| Cleric | WIS, CHA |
| Druid | INT, WIS |
| Fighter | STR, CON |
| Monk | STR, DEX |
| Paladin | WIS, CHA |
| Ranger | STR, DEX |
| Rogue | DEX, INT |
| Sorcerer | CON, CHA |
| Warlock | WIS, CHA |
| Wizard | INT, WIS |

Coverage note for tools: every ability appears at least twice. STR proficiency: barbarian, fighter, monk, ranger. INT proficiency: druid, rogue, wizard. DEX/WIS/CHA are the saves monsters force most often, so those proficiencies carry the most weight.

### What each saving throw typically resists

| Save | Classic triggers |
|---|---|
| STR | Forced movement and knockdown: shoves by spell, being hurled, entangling vines' grip |
| DEX | Area damage you can dodge: *fireball*, breath weapons, floor traps, falling debris |
| CON | Bodily assault: poison, disease, necrotic drain, extreme environments, **concentration** |
| INT | Mental invasion and illusion-piercing: psychic assault, maze-like effects |
| WIS | Will and perception of reality: charm, fear, *hold person*-type paralysis, banishment |
| CHA | Assaults on the self/soul: possession, banishment to other planes, life-force effects |

CON, DEX, and WIS are the "big three" — an AI encounter tool should assume most save-or-suffer effects target one of them.

## Common table rulings

**Q: Player wants to "roll Perception" unprompted. Allowed?**
A: The DM calls for checks, not players. Best practice: player describes what they do ("I scan the balcony"), DM decides if a roll is needed and which one. Tools should phrase suggestions the same way.

**Q: Lockpicking — Sleight of Hand or thieves' tools?**
A: Dexterity check with **thieves' tools** proficiency. Sleight of Hand is for palming and planting objects. Without thieves' tools in hand, most DMs rule improvised attempts at disadvantage or impossible.

**Q: Can the fighter Intimidate with Strength instead of Charisma?**
A: Yes, by the variant-ability rule, at the DM's discretion — Strength (Intimidation), keeping the proficiency bonus if proficient. It's an official variant, not a house rule.

**Q: Does a shield or armor affect Stealth?**
A: Armor tagged **Stealth: Disadvantage** (e.g. most heavy armor, some medium like scale mail) imposes disadvantage on Dexterity (Stealth) checks. Shields never do.

**Q: Insight said the NPC "seems truthful" but he was lying. Did the DM cheat?**
A: No. Insight vs Deception is a contest; if Deception wins, the honest-seeming read *is* the correct outcome. Insight detects intent, it is not a lie detector guaranteeing truth.

**Q: Do you add proficiency to initiative?**
A: Not by default — no class is "proficient in initiative." Only features that explicitly modify initiative or ability checks (e.g. Jack of All Trades adds ½ prof) change it.

**Q: How far can a STR 10 character long jump over a chasm?**
A: 10 ft with at least a 10 ft run-up, 5 ft from standing — automatically, no roll, if they have the movement left. A check only enters for exceeding that, clearing obstacles mid-jump, or sticking a bad landing.

**Q: Raising Constitution at level 8 — do old levels' HP recalculate?**
A: Yes. If the CON modifier increases, max HP increases by 1 per character level already taken (and per level thereafter).
