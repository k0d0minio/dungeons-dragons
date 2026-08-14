# 03 — Character Creation

> Purpose: Exact, implementable rules for building a D&D 5e (SRD 5.1) character, structured as a pipeline a form wizard (DND-008) can be derived from: inputs, derived outputs, and validation rules per step.

## Creation pipeline overview

The **character creation** sequence in SRD 5.1 order (`API: /api/2014/races`, `/api/2014/classes`, `/api/2014/backgrounds`):

| Step | Name | Required inputs | Derived outputs |
|---|---|---|---|
| 1 | Choose race | race, subrace (if any), racial choices (languages, skills, cantrip, tool) | ability bonuses, speed, size, traits, proficiencies, languages |
| 2 | Choose class | class, level-1 choices (skills, equipment, fighting style if any) | hit die, saving throws, proficiencies, features, spellcasting block |
| 3 | Determine abilities | generation method + 6 scores assigned to STR/DEX/CON/INT/WIS/CHA | final scores (base + racial), 6 ability modifiers |
| 4 | Describe | name, background, alignment, personality, languages from background | 2 background skills, tools/languages, background feature |
| 5 | Equip | starting equipment (class + background) or starting gold | AC, weapon attack/damage blocks, encumbrance |

Steps 1–3 can be reordered in UI, but final ability scores cannot be computed until both race (step 1) and base scores (step 3) exist. Validation must run on the combined result.

**Ability modifier** formula (used everywhere): `mod = floor((score − 10) / 2)`.

| Score | 1 | 2–3 | 4–5 | 6–7 | 8–9 | 10–11 | 12–13 | 14–15 | 16–17 | 18–19 | 20–21 | 22–23 | 24–25 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mod | −5 | −4 | −3 | −2 | −1 | +0 | +1 | +2 | +3 | +4 | +5 | +6 | +7 | +10 |

Score cap for PCs is **20** (racial bonuses and ASIs cannot raise a score above 20; specific class capstones may override, e.g. Barbarian 20).

## Step 3 in detail — ability score generation

Three sanctioned methods. A form should force exactly one method and validate accordingly. All limits below apply to **base scores before racial bonuses**.

### Standard array

Assign each of `15, 14, 13, 12, 10, 8` to a distinct ability. Validation: the six assigned base scores are exactly a permutation of that multiset.

### Point buy

- Budget: **27 points**. All 27 must be tracked; spending fewer is legal but the form should warn.
- Base scores must each be in **8–15** inclusive.
- Cost per final base score (total cost, not marginal):

| Score | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|
| Cost | 0 | 1 | 2 | 3 | 4 | 5 | 7 | 9 |

Validation: `sum(cost[score_i] for i in 6 abilities) ≤ 27` and every `score_i ∈ [8, 15]`.

### Rolled (4d6 drop lowest)

Roll `4d6`, drop the lowest die, sum the remaining three; repeat six times; assign freely. Range per score: 3–18. Validation: a form can only verify count (6 values) and range (3–18); provenance is on the honor system — record the raw rolls if the DM wants auditability.

> **2024 note:** the 2024 rules move ability score increases from race/species to background (+2/+1 or +1/+1/+1). Under SRD 5.1 (this app's data source) the bonuses below are racial.

## Step 1 in detail — races (`API: /api/2014/races`)

### Ability bonuses, size, speed

| Race | Bonuses | Size | Speed | Darkvision |
|---|---|---|---|---|
| Dwarf (Hill) | CON +2, WIS +1 | Medium | 25 ft | 60 ft |
| Elf (High) | DEX +2, INT +1 | Medium | 30 ft | 60 ft |
| Halfling (Lightfoot) | DEX +2, CHA +1 | Small | 25 ft | — |
| Human | +1 to all six | Medium | 30 ft | — |
| Dragonborn | STR +2, CHA +1 | Medium | 30 ft | — |
| Gnome (Rock) | INT +2, CON +1 | Small | 25 ft | 60 ft |
| Half-Elf | CHA +2, +1 to two others (player's choice, not CHA) | Medium | 30 ft | 60 ft |
| Half-Orc | STR +2, CON +1 | Medium | 30 ft | 60 ft |
| Tiefling | CHA +2, INT +1 | Medium | 30 ft | 60 ft |

SRD 5.1 includes exactly one subrace each for dwarf (Hill), elf (High), halfling (Lightfoot) and gnome (Rock); the base-race bonus and the subrace bonus are both listed above. Validation: Half-Elf's two floating +1s must go to two *different* non-CHA abilities.

### Notable traits (things a sheet must surface)

- **Dwarf**: speed **not reduced** by heavy armor. **Dwarven Resilience** — advantage on saves vs. poison, resistance to poison damage. Proficiency: battleaxe, handaxe, light hammer, warhammer; one artisan's tool (smith's, brewer's, or mason's — form choice). **Stonecunning** (double prof on History checks about stonework). *Hill*: **Dwarven Toughness** — HP max +1, and +1 again each level (fold into the HP formula).
- **Elf**: **Keen Senses** (Perception proficiency). **Fey Ancestry** — advantage on saves vs. charmed; magic can't put the elf to sleep. **Trance** (4-hour rest). *High*: proficiency longsword, shortsword, shortbow, longbow; **one wizard cantrip** (INT is its casting ability — form choice, `API: /api/2014/classes/wizard/spells`); one extra language (form choice).
- **Halfling**: **Lucky** — reroll a natural 1 on an attack roll, ability check, or saving throw (must use new roll). **Brave** — advantage on saves vs. frightened. **Halfling Nimbleness** — move through the space of any creature one size larger. *Lightfoot*: **Naturally Stealthy** — can hide behind a creature one size larger.
- **Human**: one extra language (form choice). No other traits in SRD.
- **Dragonborn**: **Draconic Ancestry** — choose a dragon type (form choice: black/acid, blue/lightning, brass/fire, bronze/lightning, copper/acid, gold/fire, green/poison, red/fire, silver/cold, white/cold). **Breath Weapon** — action; 2d6 of the ancestry damage type in a 15-ft cone (fire, cold, poison variants) or 5×30-ft line (acid, lightning); save DC = `8 + CON mod + proficiency bonus` (DEX save for line/cold/fire cones per ancestry table, CON save for poison); half damage on success; 1 use per short/long rest; damage 3d6 at level 6, 4d6 at 11, 5d6 at 16. **Damage Resistance** to the ancestry damage type.
- **Gnome**: **Gnome Cunning** — advantage on INT, WIS and CHA saves **against magic**. *Rock*: **Artificer's Lore** (double prof on History about magical/technological devices), **Tinker** (tinker's tools proficiency + clockwork devices).
- **Half-Elf**: **Fey Ancestry** (as elf). **Skill Versatility** — proficiency in **two skills of choice** (form choice, any). One extra language (form choice).
- **Half-Orc**: proficiency in **Intimidation**. **Relentless Endurance** — when reduced to 0 HP but not killed outright, drop to 1 HP instead; 1/long rest. **Savage Attacks** — on a melee weapon crit, roll one extra weapon damage die.
- **Tiefling**: **Hellish Resistance** — resistance to fire damage. **Infernal Legacy** — knows *thaumaturgy* cantrip; at level 3 casts *hellish rebuke* (as 2nd-level) 1/long rest; at level 5 casts *darkness* 1/long rest; CHA is the casting ability. (A sheet must gate these on character level.)

Validation rules for step 1: subrace required where one exists; all "form choice" fields above required; chosen languages must not duplicate ones already granted; Half-Elf skill picks must not duplicate other proficiency sources (if they collide, the form should prompt to re-pick — 5e grants no substitute by RAW, but every table allows a re-pick).

## Step 2 in detail — class at level 1 (`API: /api/2014/classes`)

Full per-class detail lives in `04-classes.md`; this table is the minimum a creation form needs to render step 2. "Skills" = number of choices; the eligible list is class-specific (see file 04).

| Class | Hit die | Saving throws | Armor prof | Skills to pick | Level-1 sub-choices the form must collect |
|---|---|---|---|---|---|
| Barbarian | d12 | STR, CON | Light, medium, shields | 2 | — |
| Bard | d8 | DEX, CHA | Light | 3 (any) | 3 instruments; cantrips ×2, spells known ×4 |
| Cleric | d8 | WIS, CHA | Light, medium, shields | 2 | Domain (Life); cantrips ×3 |
| Druid | d8 | INT, WIS | Light, medium, shields (no metal) | 2 | Cantrips ×2 |
| Fighter | d10 | STR, CON | All, shields | 2 | Fighting style ×1 |
| Monk | d8 | STR, DEX | None | 2 | 1 artisan tool or instrument |
| Paladin | d10 | WIS, CHA | All, shields | 2 | — (style + spells arrive at 2–3) |
| Ranger | d10 | STR, DEX | Light, medium, shields | 3 | Favored enemy, natural explorer terrain |
| Rogue | d8 | DEX, INT | Light | 4 | Expertise ×2 |
| Sorcerer | d6 | CON, CHA | None | 2 | Origin (Draconic) + dragon type; cantrips ×4, spells ×2 |
| Warlock | d8 | WIS, CHA | Light | 2 | Patron (Fiend); cantrips ×2, spells ×2 |
| Wizard | d6 | INT, WIS | None | 2 | Cantrips ×3, spellbook ×6 1st-level spells |

Validation rules for step 2: skill picks must come from the class's eligible list and must be distinct; spell/cantrip picks must come from that class's spell list at a legal level (`API: /api/2014/classes/{class}/spells`); every sub-choice column above is required before the step is complete.

### Starting gold (alternative to package equipment)

| Class | Gold | Class | Gold |
|---|---|---|---|
| Barbarian | 2d4 × 10 gp | Paladin | 5d4 × 10 gp |
| Bard | 5d4 × 10 gp | Ranger | 5d4 × 10 gp |
| Cleric | 5d4 × 10 gp | Rogue | 4d4 × 10 gp |
| Druid | 2d4 × 10 gp | Sorcerer | 3d4 × 10 gp |
| Fighter | 5d4 × 10 gp | Warlock | 4d4 × 10 gp |
| Monk | 5d4 gp (no ×10) | Wizard | 4d4 × 10 gp |

Taking gold **replaces both** the class and background equipment packages.

## Derived stats — exact formulas for implementers

| Stat | Formula |
|---|---|
| **HP at level 1** | `max(hit die) + CON mod` (e.g. d10 fighter, CON 14 → 10 + 2 = 12) |
| **HP per later level** | `roll(hit die) + CON mod` **or** fixed average: d6→**4**, d8→**5**, d10→**6**, d12→**7**, plus CON mod. Minimum **1 HP** gained per level even with negative CON mod. Hill Dwarf adds +1/level. Retroactivity: raising CON mod raises max HP by +1 × character level. |
| **AC (unarmored)** | `10 + DEX mod` (+2 if shield). Class alternatives: Barbarian `10 + DEX + CON`, Monk `10 + DEX + WIS` (no shield for Monk's version). Use the **highest single applicable formula**; formulas never stack with armor or each other. |
| **AC (armored)** | armor base + capped DEX (see table below) + 2 if shield |
| **Initiative** | `DEX mod` |
| **Proficiency bonus** | by character level (table below); never stacks with itself |
| **Saving throw** | `d20 + ability mod (+ prof if class grants that save)` |
| **Skill check** | `d20 + ability mod (+ prof if proficient; + 2×prof if Expertise)` |
| **Weapon attack** | `d20 + ability mod + prof` (STR melee, DEX ranged; finesse = either; thrown uses melee ability) |
| **Spell save DC** | `8 + proficiency bonus + spellcasting ability mod` |
| **Spell attack bonus** | `proficiency bonus + spellcasting ability mod` |
| **Passive Perception** | `10 + Perception bonus` (±5 for adv/disadv) |
| **Carrying capacity** | `STR score × 15` lb |

### Armor quick table (`API: /api/2014/equipment-categories/armor`)

| Armor | AC | DEX cap | Strength req | Stealth |
|---|---|---|---|---|
| Padded | 11 + DEX | — | — | Disadv |
| Leather | 11 + DEX | — | — | — |
| Studded leather | 12 + DEX | — | — | — |
| Hide | 12 + DEX | max 2 | — | — |
| Chain shirt | 13 + DEX | max 2 | — | — |
| Scale mail | 14 + DEX | max 2 | — | Disadv |
| Breastplate | 14 + DEX | max 2 | — | — |
| Half plate | 15 + DEX | max 2 | — | Disadv |
| Ring mail | 14 | 0 | — | Disadv |
| Chain mail | 16 | 0 | STR 13 | Disadv |
| Splint | 17 | 0 | STR 15 | Disadv |
| Plate | 18 | 0 | STR 15 | Disadv |
| Shield | +2 | — | — | — |

Below the STR requirement: speed −10 ft (dwarves exempt). Without armor proficiency: disadvantage on every STR/DEX-based d20 roll and cannot cast spells.

## Step 4 in detail — description

### Background (`API: /api/2014/backgrounds`)

SRD 5.1 ships exactly one background, **Acolyte**. The general anatomy every background follows (relevant for homebrew support in the form):

| Component | Count/shape | Acolyte value |
|---|---|---|
| Skill proficiencies | exactly 2, fixed | Insight, Religion |
| Tools / languages | 0–2 tools and/or 0–2 languages | 2 languages of choice |
| Equipment | fixed pack + pocket money | holy symbol, prayer book, 5 sticks of incense, vestments, common clothes, 15 gp |
| Feature | 1 narrative feature | **Shelter of the Faithful** (aid from temples of your faith) |
| Characteristics | personality trait, ideal, bond, flaw (freeform or d8/d6/d6/d6 tables) | tables provided |

Validation: if a background skill duplicates a class/race skill, the standard ruling is the player picks a replacement skill of their choice.

### Alignment

Two axes: Lawful/Neutral/Chaotic × Good/Neutral/Evil → 9 values (LG, NG, CG, LN, N, CN, LE, NE, CE). Purely descriptive in 5e — **no mechanical effect** on PCs in the SRD. Optional free-text field is acceptable.

### Languages (`API: /api/2014/languages`)

Standard: Common, Dwarvish, Elvish, Giant, Gnomish, Goblin, Halfling, Orc. Exotic: Abyssal, Celestial, Draconic, Deep Speech, Infernal, Primordial, Sylvan, Undercommon. Every race grants Common plus its own; "extra language" choices should exclude already-known ones.

## Step 5 in detail — equipment

Each class lists fixed starting equipment with either/or choices (`API: /api/2014/classes/{class}` → `starting_equipment`, `starting_equipment_options`); the background adds its pack. Alternative rule: roll class starting gold and buy everything (skip both packages). Form validation: every either/or slot resolved; compute AC and attack blocks from final inventory; warn if total weight > STR × 15.

## Level advancement

### XP, proficiency bonus (`API: /api/2014/classes/{class}/levels`)

| Level | XP | Prof | Level | XP | Prof |
|---|---|---|---|---|---|
| 1 | 0 | +2 | 11 | 85,000 | +4 |
| 2 | 300 | +2 | 12 | 100,000 | +4 |
| 3 | 900 | +2 | 13 | 120,000 | +5 |
| 4 | 2,700 | +2 | 14 | 140,000 | +5 |
| 5 | 6,500 | +3 | 15 | 165,000 | +5 |
| 6 | 14,000 | +3 | 16 | 195,000 | +5 |
| 7 | 23,000 | +3 | 17 | 225,000 | +6 |
| 8 | 34,000 | +3 | 18 | 265,000 | +6 |
| 9 | 48,000 | +4 | 19 | 305,000 | +6 |
| 10 | 64,000 | +4 | 20 | 355,000 | +6 |

Proficiency bonus is driven by **total character level** (all classes combined), never per class.

### Ability Score Improvements (ASI)

At **class levels** 4, 8, 12, 16, 19: increase one ability by 2 or two abilities by 1 (cap 20). Extras: **Fighter** also at 6 and 14 (7 total); **Rogue** also at 10 (6 total). ASIs key off *class* level, so multiclass characters can lose ASIs (e.g. Fighter 3/Wizard 3 has none).

**Feats (variant rule):** a feat may replace an ASI. The SRD includes exactly one feat, **Grappler** — prerequisite STR 13; advantage on attack rolls vs. a creature you are grappling; action to attempt to pin (both restrained on success). A form supporting feats generically needs: name, prerequisite check, replaces-one-ASI slot.

## Multiclassing (optional rule)

### Prerequisites — must meet the requirement for **both** the current class and the new class

| Class | Minimum score | Class | Minimum score |
|---|---|---|---|
| Barbarian | STR 13 | Paladin | STR 13 **and** CHA 13 |
| Bard | CHA 13 | Ranger | DEX 13 **and** WIS 13 |
| Cleric | WIS 13 | Rogue | DEX 13 |
| Druid | WIS 13 | Sorcerer | CHA 13 |
| Fighter | STR 13 **or** DEX 13 | Warlock | CHA 13 |
| Monk | DEX 13 **and** WIS 13 | Wizard | INT 13 |

### Proficiencies gained when multiclassing **into** a class (not the full level-1 set)

| New class | Gained |
|---|---|
| Barbarian | Shields, simple weapons, martial weapons |
| Bard | Light armor, one skill of choice, one musical instrument |
| Cleric | Light armor, medium armor, shields |
| Druid | Light armor, medium armor, shields (no metal) |
| Fighter | Light/medium armor, shields, simple + martial weapons |
| Monk | Simple weapons, shortswords |
| Paladin | Light/medium armor, shields, simple + martial weapons |
| Ranger | Light/medium armor, shields, simple + martial weapons, one skill |
| Rogue | Light armor, one skill of choice, thieves' tools |
| Sorcerer | — (nothing) |
| Warlock | Light armor, simple weapons |
| Wizard | — (nothing) |

Hit points: level 1 max-die applies only to the very first class ever taken; every later level of any class uses the roll-or-average rule.

### Multiclass spell slots

Compute **multiclass caster level**:

`caster level = (full-caster levels) + floor(paladin+ranger levels / 2) + floor(third-caster levels / 3)`

- **Full casters**: Bard, Cleric, Druid, Sorcerer, Wizard — count every level.
- **Half casters**: Paladin, Ranger — half, rounded down.
- **Third casters**: subclasses with the Spellcasting feature at fighter/rogue 3 (Eldritch Knight, Arcane Trickster — *not* SRD subclasses; the SRD's Champion and Thief contribute 0).
- **Warlock is excluded** — Pact Magic never adds to this number.

Then read slots off the shared table (identical to the full-caster table):

| CL | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th | 9th |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2 | — | — | — | — | — | — | — | — |
| 2 | 3 | — | — | — | — | — | — | — | — |
| 3 | 4 | 2 | — | — | — | — | — | — | — |
| 4 | 4 | 3 | — | — | — | — | — | — | — |
| 5 | 4 | 3 | 2 | — | — | — | — | — | — |
| 6 | 4 | 3 | 3 | — | — | — | — | — | — |
| 7 | 4 | 3 | 3 | 1 | — | — | — | — | — |
| 8 | 4 | 3 | 3 | 2 | — | — | — | — | — |
| 9 | 4 | 3 | 3 | 3 | 1 | — | — | — | — |
| 10 | 4 | 3 | 3 | 3 | 2 | — | — | — | — |
| 11 | 4 | 3 | 3 | 3 | 2 | 1 | — | — | — |
| 12 | 4 | 3 | 3 | 3 | 2 | 1 | — | — | — |
| 13 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | — | — |
| 14 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | — | — |
| 15 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | — |
| 16 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | — |
| 17 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | 1 |
| 18 | 4 | 3 | 3 | 3 | 3 | 1 | 1 | 1 | 1 |
| 19 | 4 | 3 | 3 | 3 | 3 | 2 | 1 | 1 | 1 |
| 20 | 4 | 3 | 3 | 3 | 3 | 2 | 2 | 1 | 1 |

Spells **known/prepared** are still computed per class as if single-classed at that class's level; the table above governs **slots only**. A character can end up with slots higher than any spell they know — legal; they can upcast into them.

### Pact Magic interaction

Warlock slots are tracked **separately** (short-rest recharge, fixed slot level). Cross-use is legal both ways: pact slots can cast spells known from other classes, and multiclass slots can cast warlock spells. Paladin can fuel Divine Smite with pact slots.

### Worked examples (test fixtures)

| Build | Caster level | Shared slots | Separate pact slots |
|---|---|---|---|
| Wizard 5 | 5 | 4/3/2 | — |
| Cleric 3 / Wizard 2 | 5 | 4/3/2 | — |
| Paladin 5 / Bard 3 | floor(5/2)+3 = 5 | 4/3/2 | — |
| Paladin 1 / Ranger 1 | floor(1/2)+floor(1/2) = 0* | none from table | — |
| Warlock 5 / Sorcerer 4 | 4 (warlock excluded) | 4/3 | 2 × 3rd-level |
| Fighter (Champion) 12 / Wizard 1 | 0 + 1 = 1 | 2 × 1st | — |

\* Levels are summed **before** dividing per class group: Paladin 1/Ranger 1 is `floor((1+1)/2) = 1` → caster level 1 by RAW aggregation of half-caster levels; implementers should sum half-caster levels first, then halve (and sum third-caster levels first, then divide by 3).

HP fixture: Hill Dwarf Fighter 1 → Barbarian 2, CON 16 (+3), average HP: level 1 fighter `10+3+1 = 14`; levels 2–3 barbarian `(7+3+1) × 2 = 22`; total **36**.

## Form wizard field checklist (DND-008)

Minimum persisted fields for a valid level-1 character, in dependency order:

1. `race`, `subrace?`, `racial_choices{}` (languages, skills, cantrip, tool, ancestry, floating ASIs)
2. `class`, `class_skill_choices[]`, `class_sub_choices{}` (style, domain/origin/patron, spells)
3. `ability_method` (`standard|pointbuy|rolled`) + `base_scores{str..cha}` → validate per method → `final_scores = base + racial`
4. `background` (+ its choices), `alignment?`, `name`
5. `equipment_selections[]` **or** `rolled_gold`
6. Derived (never stored as user input, always recomputed): modifiers, HP, AC candidates, initiative, prof bonus, saves, skills, passive Perception, spell DC/attack (if caster).

## Common table rulings

## Common table rulings

**Q: Can point-buy scores go above 15 or below 8?** A: No — 8–15 before racial bonuses, hard limits. Racial bonuses can then push the final score to 17 at creation.

**Q: My CON is negative — can I lose HP on level-up?** A: No. Each level grants a minimum of 1 HP regardless of roll + CON mod.

**Q: Do Barbarian Unarmored Defense and a shield stack?** A: Yes — 10 + DEX + CON + 2 (shield). Monk Unarmored Defense does not work with a shield. Neither works while wearing any armor, and two unarmored-defense formulas never combine.

**Q: Half-Elf puts both +1s in the same ability?** A: Not allowed — two *different* abilities, neither of them Charisma.

**Q: Background gives a skill I already have from class — wasted?** A: Standard ruling: pick any replacement skill proficiency.

**Q: Does multiclassing delay ASIs?** A: Yes. ASIs trigger on class level (4/8/12/16/19 + class extras), so a Fighter 3/Rogue 3 (character level 6) has zero ASIs.

**Q: Which level uses the max hit die when multiclassing?** A: Only character level 1 in the first class taken. Every subsequent level of any class rolls or takes the average.

**Q: Is alignment mechanically enforced (e.g. Paladin must be Lawful Good)?** A: Not in SRD 5.1. Alignment has no PC mechanics; oaths and tenets are roleplay contracts adjudicated by the DM.
