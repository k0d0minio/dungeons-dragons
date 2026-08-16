# 04 — Classes

> Purpose: per-class reference (SRD 5.1) for the 12 base classes — stat blocks, spellcasting model, and the level-keyed feature tables a player or DM needs to track. (`API: /api/2014/classes/{class}/levels`, `/api/2014/features`)

## Class comparison

| Class | Hit die | Saves | Casting | SRD subclass (level gained) | New-player complexity |
|---|---|---|---|---|---|
| Barbarian | d12 | STR, CON | None | Path of the Berserker (3) | Low |
| Bard | d8 | DEX, CHA | Full, known, CHA | College of Lore (3) | Medium-high |
| Cleric | d8 | WIS, CHA | Full, prepared, WIS | Life Domain (1) | High |
| Druid | d8 | INT, WIS | Full, prepared, WIS | Circle of the Land (2) | High |
| Fighter | d10 | STR, CON | None (Champion) | Champion (3) | Low |
| Monk | d8 | STR, DEX | None (ki abilities) | Way of the Open Hand (3) | Medium |
| Paladin | d10 | WIS, CHA | Half, prepared, CHA (from 2) | Oath of Devotion (3) | Medium |
| Ranger | d10 | STR, DEX | Half, known, WIS (from 2) | Hunter (3) | Medium |
| Rogue | d8 | DEX, INT | None (Thief) | Thief (3) | Low-medium |
| Sorcerer | d6 | CON, CHA | Full, known, CHA | Draconic Bloodline (1) | Medium-high |
| Warlock | d8 | WIS, CHA | Pact, known, CHA | The Fiend (1) | Medium |
| Wizard | d6 | INT, WIS | Full, prepared from spellbook, INT | School of Evocation (2) | High |

Casting vocabulary: **full** = uses the 1st–9th slot table at full level; **half** = slots as half level (Paladin/Ranger, max 5th-level spells); **pact** = Warlock's separate short-rest slots; **known** = fixed learned list, swaps on level-up; **prepared** = re-picks daily from class list (or spellbook).

---

## Barbarian

| Hit die | Primary | Saves | Armor | Weapons | Skills |
|---|---|---|---|---|---|
| d12 | STR | STR, CON | Light, medium, shields | Simple, martial | 2 from Animal Handling, Athletics, Intimidation, Nature, Perception, Survival |

Role: front-line damage sponge that trades defense math (resistance while raging) for reckless offense. Spellcasting: **none**.

### Rage uses and damage

| Level | Rages/long rest | Rage damage bonus |
|---|---|---|
| 1–2 | 2 | +2 |
| 3–5 | 3 | +2 |
| 6–8 | 4 | +2 |
| 9–11 | 4 | +3 |
| 12–15 | 5 | +3 |
| 16 | 5 | +4 |
| 17–19 | 6 | +4 |
| 20 | Unlimited | +4 |

**Rage** (bonus action, 1 minute): advantage on STR checks/saves, +rage damage on STR melee attacks, resistance to bludgeoning/piercing/slashing. Ends early if a turn passes with no attack made and no damage taken. No raging in heavy armor; **casting or concentrating on spells is impossible while raging**.

| Level | Feature |
|---|---|
| 1 | Rage; Unarmored Defense (AC = 10 + DEX + CON, shield allowed) |
| 2 | Reckless Attack (advantage on STR melee attacks this turn; attacks against you have advantage until your next turn); Danger Sense (advantage on DEX saves vs. effects you can see) |
| 3 | Path of the Berserker |
| 4 | ASI (also 8, 12, 16, 19) |
| 5 | **Extra Attack** (2 attacks); Fast Movement (+10 ft speed, no heavy armor) |
| 7 | Feral Instinct (advantage on initiative; act while surprised if you rage first) |
| 9 | Brutal Critical (+1 weapon die on melee crit; +2 dice at 13, +3 at 17) |
| 11 | Relentless Rage (drop to 1 HP instead of 0 while raging on CON save DC 10, +5 per repeat before rest) |
| 15 | Persistent Rage (rage only ends early if unconscious or you choose) |
| 18 | Indomitable Might (STR check minimum = STR score) |
| 20 | Primal Champion (STR and CON +4, caps become 24) |

**Path of the Berserker**: Frenzy (3 — bonus-action attack every rage turn, one level of exhaustion after), Mindless Rage (6 — can't be charmed/frightened while raging), Intimidating Presence (10), Retaliation (14 — reaction melee attack vs. damager within 5 ft).

---

## Bard

| Hit die | Primary | Saves | Armor | Weapons | Skills |
|---|---|---|---|---|---|
| d8 | CHA | DEX, CHA | Light | Simple + hand crossbow, longsword, rapier, shortsword | **Any 3** |

Role: full-caster support/skill-monkey who buffs allies with inspiration dice and steals utility from every list. Spellcasting: **full caster, known spells, CHA**, ritual casting.

### Bardic Inspiration die

| Bard level | 1–4 | 5–9 | 10–14 | 15–20 |
|---|---|---|---|---|
| Die | d6 | d8 | d10 | d12 |

Uses = **CHA mod** (min 1); bonus action, one creature other than self, die usable within 10 minutes on one ability check, attack roll or save. Recharges on long rest; **short rest too from level 5** (Font of Inspiration).

| Level | Feature |
|---|---|
| 1 | Spellcasting; Bardic Inspiration (d6) |
| 2 | Jack of All Trades (+floor(prof/2) to non-proficient ability checks); Song of Rest (extra d6 HP on short-rest healing; d8 at 9, d10 at 13, d12 at 17) |
| 3 | College of Lore; **Expertise** (double prof on 2 proficient skills; 2 more at 10) |
| 4 | ASI (also 8, 12, 16, 19) |
| 5 | Font of Inspiration (inspiration recharges on short rest) |
| 6 | Countercharm (performance grants advantage vs. charm/fear nearby) |
| 10 | **Magical Secrets** (learn 2 spells from ANY class list; +2 at 14 and 18) |
| 20 | Superior Inspiration (regain 1 use on initiative if at 0) |

**College of Lore**: Bonus Proficiencies (3 — any three skills), Cutting Words (3 — reaction: subtract an inspiration die from an enemy's attack/check/damage), Additional Magical Secrets (6 — 2 early any-list spells), Peerless Skill (14 — inspiration die on own checks).

---

## Cleric

| Hit die | Primary | Saves | Armor | Weapons | Skills |
|---|---|---|---|---|---|
| d8 | WIS | WIS, CHA | Light, medium, shields | Simple | 2 from History, Insight, Medicine, Persuasion, Religion |

Role: armored full caster; the party's healing, undead control and divine buffs. Spellcasting: **full caster, prepared** — prepares `WIS mod + cleric level` spells daily from the whole cleric list; ritual casting. Domain spells are always prepared and don't count against that number.

| Level | Feature |
|---|---|
| 1 | Spellcasting; Divine Domain (Life) + domain feature |
| 2 | **Channel Divinity** 1/short-or-long rest: Turn Undead (WIS save or undead flees 1 min) + domain option. 2 uses/rest at 6, 3 at 18 |
| 4 | ASI (also 8, 12, 16, 19) |
| 5 | Destroy Undead: turned undead of CR ≤ 1/2 are destroyed (CR ≤ 1 at 8, ≤ 2 at 11, ≤ 3 at 14, ≤ 4 at 17) |
| 8 | Domain damage feature (Life: Divine Strike) |
| 10 | **Divine Intervention** — action; succeeds on d100 ≤ cleric level; 7-day cooldown on success; automatic at 20 |

**Life Domain**: bonus heavy armor proficiency (1); **Disciple of Life** (1 — healing spells add `2 + spell slot level` HP); CD: Preserve Life (2 — distribute `5 × cleric level` HP, max half a target's HP); Blessed Healer (6 — self-heal 2 + spell level when healing others); Divine Strike (8 — +1d8 radiant on a weapon hit 1/turn, 2d8 at 14); Supreme Healing (17 — healing dice are maximized).

---

## Druid

| Hit die | Primary | Saves | Armor | Weapons | Skills |
|---|---|---|---|---|---|
| d8 | WIS | INT, WIS | Light, medium, shields (**no metal**) | Club, dagger, dart, javelin, mace, quarterstaff, scimitar, sickle, sling, spear | 2 from Arcana, Animal Handling, Insight, Medicine, Nature, Perception, Religion, Survival; herbalism kit |

Role: shapeshifting full caster; battlefield control, healing and beast-form utility/tanking. Spellcasting: **full caster, prepared** (`WIS mod + druid level` daily), ritual casting, Druidic language.

### Wild Shape limits

| Druid level | Max CR | Restrictions | Example |
|---|---|---|---|
| 2 | 1/4 | No flying or swimming speed | Wolf |
| 4 | 1/2 | No flying speed | Crocodile |
| 8 | 1 | — | Giant eagle |

2 uses per short/long rest; duration `floor(level / 2)` hours; beast's physical stats replace yours (keep INT/WIS/CHA, personality, saves/skill proficiencies if better); you get the beast's HP as a buffer, revert at 0 with excess damage carrying over; **no spellcasting in beast form** (concentration persists).

| Level | Feature |
|---|---|
| 1 | Druidic; Spellcasting |
| 2 | **Wild Shape**; Circle of the Land |
| 4 | ASI (also 8, 12, 16, 19); Wild Shape upgrade |
| 8 | Wild Shape upgrade (CR 1) |
| 18 | Timeless Body; Beast Spells (cast in beast form, no material components) |
| 20 | Archdruid (unlimited Wild Shape; ignore verbal/somatic components) |

**Circle of the Land**: Bonus Cantrip + **Natural Recovery** (2 — 1/day on short rest recover slots totaling `ceil(level/2)`, none 6th+); Circle Spells (3/5/7/9 — terrain-keyed always-prepared list, form choice of terrain); Land's Stride (6); Nature's Ward (10 — immune to poison/disease, charm/fear from elementals/fey); Nature's Sanctuary (14).

---

## Fighter

| Hit die | Primary | Saves | Armor | Weapons | Skills |
|---|---|---|---|---|---|
| d10 | STR or DEX | STR, CON | **All armor**, shields | Simple, martial | 2 from Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, Survival |

Role: the weapon-master baseline — most attacks, most ASIs, simplest resource loop. Spellcasting: **none** with the SRD subclass (Champion); third-caster only via non-SRD Eldritch Knight.

Fighting Styles (choose 1 at level 1): Archery (+2 ranged attack rolls), Defense (+1 AC in armor), Dueling (+2 damage with a one-handed weapon and no other weapon), Great Weapon Fighting (reroll 1–2 on two-handed damage dice, once each), Protection (reaction + shield: impose disadvantage on attack vs. adjacent ally), Two-Weapon Fighting (add ability mod to off-hand damage).

| Level | Feature |
|---|---|
| 1 | Fighting Style; **Second Wind** (bonus action, heal 1d10 + fighter level, 1/short rest) |
| 2 | **Action Surge** (1 extra action, 1/short rest; 2 uses at 17, max 1/turn) |
| 3 | Champion |
| 4 | ASI — fighter gets them at **4, 6, 8, 12, 14, 16, 19** (7 total) |
| 5 | **Extra Attack** (2 attacks; **3 at 11, 4 at 20**) |
| 9 | Indomitable (reroll a failed save, 1/long rest; 2 at 13, 3 at 17) |

**Champion**: Improved Critical (3 — crit on **19–20**), Remarkable Athlete (7 — half prof to non-proficient STR/DEX/CON checks, +STR-mod feet on running jumps), Additional Fighting Style (10), Superior Critical (15 — crit on **18–20**), Survivor (18 — regain 5 + CON mod HP each turn while below half HP and above 0).

---

## Monk

| Hit die | Primary | Saves | Armor | Weapons | Skills |
|---|---|---|---|---|---|
| d8 | DEX & WIS | STR, DEX | None | Simple + shortswords | 2 from Acrobatics, Athletics, History, Insight, Religion, Stealth; 1 artisan tool or instrument |

Role: mobile unarmored skirmisher converting **ki** into extra attacks, defense and stuns. Spellcasting: **none** (ki save DC = `8 + prof + WIS mod`).

### Martial Arts / Ki / Movement progression

| Monk level | Martial Arts die | Ki points | Unarmored Movement |
|---|---|---|---|
| 1 | d4 | — | — |
| 2–4 | d4 | = level | +10 ft |
| 5 | d6 | = level | +10 ft |
| 6–9 | d6 | = level | +15 ft |
| 10 | d6 | = level | +20 ft |
| 11–13 | d8 | = level | +20 ft |
| 14–16 | d8 | = level | +25 ft |
| 17 | d10 | = level | +25 ft |
| 18–20 | d10 | = level | +30 ft |

Ki recharges on short or long rest. Core ki spends (level 2+, 1 ki each): **Flurry of Blows** (bonus action, 2 unarmed strikes after Attack), **Patient Defense** (bonus action Dodge), **Step of the Wind** (bonus action Disengage/Dash, jump doubled).

| Level | Feature |
|---|---|
| 1 | Unarmored Defense (AC = 10 + DEX + WIS, no armor/shield); Martial Arts (DEX for monk weapons/unarmed; bonus-action unarmed strike after attacking) |
| 2 | Ki; Unarmored Movement |
| 3 | Way of the Open Hand; Deflect Missiles (reaction: reduce ranged damage by 1d10 + DEX + level; catch and throw for 1 ki) |
| 4 | ASI (also 8, 12, 16, 19); Slow Fall (reduce fall damage by 5 × level) |
| 5 | **Extra Attack**; **Stunning Strike** (1 ki on a hit: CON save or stunned until end of your next turn) |
| 6 | Ki-Empowered Strikes (unarmed strikes count as magical) |
| 7 | Evasion (DEX save: half → none, fail → half); Stillness of Mind |
| 10 | Purity of Body (immune to disease and poison) |
| 13 | Tongue of the Sun and Moon |
| 14 | Diamond Soul (proficiency in **all saves**; 1 ki to reroll a failed save) |
| 15 | Timeless Body |
| 18 | Empty Body (4 ki: invisible + resist all but force, 1 min; 8 ki: *astral projection*) |
| 20 | Perfect Self (regain 4 ki on initiative if at 0) |

**Way of the Open Hand**: Open Hand Technique (3 — Flurry riders: knock prone (DEX save), push 15 ft (STR save), or no reactions), Wholeness of Body (6 — action, heal 3 × level, 1/long rest), Tranquility (11), Quivering Palm (17 — 3 ki; delayed CON save vs. drop to 0 HP).

---

## Paladin

| Hit die | Primary | Saves | Armor | Weapons | Skills |
|---|---|---|---|---|---|
| d10 | STR & CHA | WIS, CHA | All armor, shields | Simple, martial | 2 from Athletics, Insight, Intimidation, Medicine, Persuasion, Religion |

Role: heavy-armor half-caster; burst melee damage via Smite plus the game's best party saves aura. Spellcasting: **half caster, prepared, CHA**, starts at level 2; prepares `CHA mod + floor(paladin level / 2)` daily; max 5th-level spells.

| Level | Feature |
|---|---|
| 1 | Divine Sense (detect celestial/fiend/undead within 60 ft; `1 + CHA mod` uses/long rest); **Lay on Hands** (heal pool = `5 × paladin level`; 5 points cure a disease or poison) |
| 2 | Fighting Style (Defense, Dueling, Great Weapon Fighting, Protection); Spellcasting; **Divine Smite** — on a melee weapon hit, spend a slot: +2d8 radiant (1st-level slot) +1d8 per higher slot level (max 5d8), +1d8 vs. undead/fiends |
| 3 | Divine Health (immune to disease); Oath of Devotion + Channel Divinity 1/short-or-long rest |
| 4 | ASI (also 8, 12, 16, 19) |
| 5 | **Extra Attack** |
| 6 | **Aura of Protection** — you and allies within 10 ft add **+CHA mod to all saving throws** (30 ft at 18) |
| 10 | Aura of Courage (allies in aura can't be frightened) |
| 11 | Improved Divine Smite (+1d8 radiant on every melee weapon hit, always on) |
| 14 | Cleansing Touch (end a spell on self/ally, CHA-mod uses/long rest) |

**Oath of Devotion**: CD options (3): Sacred Weapon (+CHA mod to attack rolls with one weapon, 1 min) and Turn the Unholy (fiends/undead); Aura of Devotion (7 — aura allies immune to charm); Purity of Spirit (15 — permanent *protection from evil and good*); Holy Nimbus (20 — 1 min: bright light, 10 radiant to enemies starting in it, advantage on saves vs. fiend/undead spells).

---

## Ranger

| Hit die | Primary | Saves | Armor | Weapons | Skills |
|---|---|---|---|---|---|
| d10 | DEX & WIS | STR, DEX | Light, medium, shields | Simple, martial | **3** from Animal Handling, Athletics, Insight, Investigation, Nature, Perception, Stealth, Survival |

Role: wilderness half-caster striker — ranged or two-weapon damage with scouting/tracking utility. Spellcasting: **half caster, known spells, WIS**, starts at level 2; max 5th-level spells.

| Level | Feature |
|---|---|
| 1 | Favored Enemy (choose creature type: advantage on Survival to track + INT checks to recall; +1 type at 6 and 14); Natural Explorer (choose terrain: expertise-like travel benefits; +1 terrain at 6 and 10) |
| 2 | Fighting Style (Archery, Defense, Dueling, Two-Weapon Fighting); Spellcasting |
| 3 | Hunter; Primeval Awareness (spend a slot to sense creature types within 1 mile) |
| 4 | ASI (also 8, 12, 16, 19) |
| 5 | **Extra Attack** |
| 8 | Land's Stride (nonmagical difficult terrain costs no extra movement) |
| 10 | Hide in Plain Sight (+10 Stealth while camouflaged and still) |
| 14 | Vanish (Hide as bonus action; can't be tracked nonmagically) |
| 18 | Feral Senses (fight unseen creatures without disadvantage; sense invisible within 30 ft) |
| 20 | Foe Slayer (+WIS mod to one attack or damage roll per turn vs. favored enemy) |

**Hunter** (each tier is a form choice): Hunter's Prey (3 — Colossus Slayer +1d8 vs. wounded 1/turn, Giant Killer, or Horde Breaker extra attack vs. adjacent second target); Defensive Tactics (7); Multiattack (11 — **Volley**: attack every target in 10-ft radius, or **Whirlwind Attack**: attack all within 5 ft); Superior Hunter's Defense (15).

---

## Rogue

| Hit die | Primary | Saves | Armor | Weapons | Skills |
|---|---|---|---|---|---|
| d8 | DEX | DEX, INT | Light | Simple + hand crossbow, longsword, rapier, shortsword | **4** from Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, Stealth; thieves' tools |

Role: skill specialist and single-target striker; one big Sneak Attack per turn plus unmatched checks via Expertise. Spellcasting: **none** with the SRD subclass (Thief); third-caster only via non-SRD Arcane Trickster.

### Sneak Attack dice

| Rogue level | 1 | 3 | 5 | 7 | 9 | 11 | 13 | 15 | 17 | 19 |
|---|---|---|---|---|---|---|---|---|---|---|
| Extra damage | 1d6 | 2d6 | 3d6 | 4d6 | 5d6 | 6d6 | 7d6 | 8d6 | 9d6 | 10d6 |

Conditions: **once per turn** (not per round — reactions can trigger a second one on another turn), finesse or ranged weapon, and either advantage on the attack OR an enemy of the target within 5 ft of it (and you don't have disadvantage).

| Level | Feature |
|---|---|
| 1 | **Expertise** (double proficiency on 2 skills or 1 skill + thieves' tools; 2 more at 6); Sneak Attack; Thieves' Cant |
| 2 | **Cunning Action** (bonus action: Dash, Disengage or Hide, every turn) |
| 3 | Thief |
| 4 | ASI — rogue gets them at **4, 8, 10, 12, 16, 19** (6 total) |
| 5 | Uncanny Dodge (reaction: halve one attacker's damage) |
| 7 | Evasion (DEX save: half → none, fail → half) |
| 11 | Reliable Talent (proficient ability checks treat d20 rolls of 1–9 as 10) |
| 14 | Blindsense (know hidden/invisible creatures within 10 ft) |
| 15 | Slippery Mind (WIS save proficiency) |
| 18 | Elusive (no attacker gets advantage against you while you're not incapacitated) |
| 20 | Stroke of Luck (turn a miss into a hit or a failed check into a 20; 1/short rest) |

**Thief**: Fast Hands (3 — Cunning Action adds Sleight of Hand, thieves' tools use, Use an Object), Second-Story Work (3 — climb at full speed, longer running jumps), Supreme Sneak (9), Use Magic Device (13 — ignore all magic-item class/race/level requirements), Thief's Reflexes (17 — two turns in round 1).

---

## Sorcerer

| Hit die | Primary | Saves | Armor | Weapons | Skills |
|---|---|---|---|---|---|
| d6 | CHA | CON, CHA | None | Dagger, dart, sling, quarterstaff, light crossbow | 2 from Arcana, Deception, Insight, Intimidation, Persuasion, Religion |

Role: full caster with a short known list but the game's only slot-shaping resource (sorcery points + Metamagic). Spellcasting: **full caster, known spells, CHA**; no ritual casting.

### Sorcery points & Flexible Casting

**Sorcery points** = sorcerer level (from level 2), recharge on long rest. Conversions (any number per turn, bonus action to create slots):

| Slot level | 1st | 2nd | 3rd | 4th | 5th |
|---|---|---|---|---|---|
| Points to create slot | 2 | 3 | 5 | 6 | 7 |
| Points gained by burning slot | 1 | 2 | 3 | 4 | 5 |

Created slots vanish on long rest; slots of 6th+ cannot be created.

**Metamagic**: choose **2 options at level 3**, +1 at 10, +1 at 17. SRD options: Careful (1 pt), Distant (1), Empowered (1 — reroll CHA-mod damage dice), Extended (1), Heightened (3 — one target has disadvantage on first save), Quickened (2 — 1-action spell becomes bonus action), Subtle (1 — no verbal/somatic), Twinned (spell level in points, min 1 — second target for single-target spells). Only one metamagic per spell unless stated.

| Level | Feature |
|---|---|
| 1 | Spellcasting; Draconic Bloodline (Dragon Ancestor + Draconic Resilience) |
| 2 | Font of Magic (sorcery points, Flexible Casting) |
| 3 | Metamagic (2 options) |
| 4 | ASI (also 8, 12, 16, 19) |
| 10 | 3rd Metamagic option |
| 17 | 4th Metamagic option |
| 20 | Sorcerous Restoration (regain 4 sorcery points on short rest) |

**Draconic Bloodline**: Dragon Ancestor (1 — pick dragon type; double prof on CHA checks vs. dragons) and **Draconic Resilience** (1 — +1 HP per sorcerer level; unarmored AC = **13 + DEX mod**); Elemental Affinity (6 — +CHA mod damage to spells of the ancestry's type; 1 pt for 1-hour resistance); Dragon Wings (14 — fly speed); Draconic Presence (18).

---

## Warlock

| Hit die | Primary | Saves | Armor | Weapons | Skills |
|---|---|---|---|---|---|
| d8 | CHA | WIS, CHA | Light | Simple | 2 from Arcana, Deception, History, Intimidation, Investigation, Nature, Religion |

Role: short-rest-cycle caster built around a signature cantrip (*eldritch blast* + invocations) and a few always-max-level slots. Spellcasting: **Pact Magic, known spells, CHA** — NOT the shared slot table and never added to multiclass caster level.

### Pact Magic progression (the quirks)

| Warlock level | Slots | Slot level | Cantrips | Spells known | Invocations |
|---|---|---|---|---|---|
| 1 | 1 | 1st | 2 | 2 | — |
| 2 | 2 | 1st | 2 | 3 | 2 |
| 3 | 2 | **2nd** | 2 | 4 | 2 |
| 5 | 2 | **3rd** | 3 | 6 | 3 |
| 7 | 2 | **4th** | 3 | 8 | 4 |
| 9 | 2 | **5th** | 3 | 10 | 5 |
| 11 | **3** | 5th | 3 | 11 (+Arcanum 6th) | 5 |
| 13 | 3 | 5th | 3 | 12 (+Arcanum 7th) | 6 |
| 15 | 3 | 5th | 4 | 13 (+Arcanum 8th) | 7 |
| 17 | **4** | 5th | 4 | 14 (+Arcanum 9th) | 7 |
| 18–20 | 4 | 5th | 4 | 14–15 | 8 |

Rules to track: **all slots are the same level** (every spell auto-upcasts to slot level, capped at 5th); slots recharge on a **short rest**; **Mystic Arcanum** (11/13/15/17) grants one 6th/7th/8th/9th-level spell castable **1/long rest without a slot**.

| Level | Feature |
|---|---|
| 1 | Otherworldly Patron (The Fiend); Pact Magic |
| 2 | **Eldritch Invocations** (2; retrain 1 per level-up; some have level/pact prerequisites, e.g. Agonizing Blast: +CHA mod to *eldritch blast* damage) |
| 3 | **Pact Boon** — Pact of the Chain (find familiar+, special forms), Pact of the Blade (summon a melee weapon, proficiency with it), or Pact of the Tome (3 any-list cantrips) |
| 4 | ASI (also 8, 12, 16, 19) |
| 11/13/15/17 | Mystic Arcanum (6th/7th/8th/9th) |
| 20 | Eldritch Master (1-minute plea: regain all pact slots, 1/long rest) |

**The Fiend**: Dark One's Blessing (1 — killing blow grants `CHA mod + warlock level` temp HP), Dark One's Own Luck (6 — +1d10 to a check or save, 1/short rest), Fiendish Resilience (10 — pick a damage type to resist after each rest), Hurl Through Hell (14 — on hit, banish target for 10d10 psychic, 1/long rest).

> **2024 note:** the 2024 warlock gets invocations at level 1 and reworks Pact Boons as invocations; SRD 5.1 (above) starts invocations at 2 with the Pact Boon as a separate level-3 feature.

---

## Wizard

| Hit die | Primary | Saves | Armor | Weapons | Skills |
|---|---|---|---|---|---|
| d6 | INT | INT, WIS | None | Dagger, dart, sling, quarterstaff, light crossbow | 2 from Arcana, History, Insight, Investigation, Medicine, Religion |

Role: the widest spell list in the game, gated by a **spellbook**: fragile, preparation-driven, endlessly flexible. Spellcasting: **full caster, prepared from spellbook, INT** — prepares `INT mod + wizard level` daily from the book only; ritual casting **directly from the book** (rituals need not be prepared).

Spellbook economy (a form must model this): starts with **6 1st-level spells**; +**2 free spells per wizard level**; copying found spells costs **50 gp and 2 hours per spell level** and the spell must be of a castable level.

| Level | Feature |
|---|---|
| 1 | Spellcasting; **Arcane Recovery** (1/day on short rest: recover slots totaling `ceil(wizard level / 2)`, no slot 6th+) |
| 2 | School of Evocation |
| 4 | ASI (also 8, 12, 16, 19) |
| 18 | Spell Mastery (one 1st- and one 2nd-level spell castable at will without slots) |
| 20 | Signature Spells (two 3rd-level spells always prepared, each 1/short rest free) |

**School of Evocation**: Evocation Savant (2 — copy evocation spells at half gold/time) and **Sculpt Spells** (2 — choose `1 + spell level` creatures to auto-succeed and take no damage from your evocation AoE); Potent Cantrip (6 — cantrip saves still take half damage); **Empowered Evocation** (10 — +INT mod to one damage roll of any evocation spell); Overchannel (14 — maximize a 1st–5th-level spell's damage; repeats deal escalating self-damage).

---

## Common table rulings

**Q: Does Extra Attack stack across classes (Fighter 5/Ranger 5)?** A: No. Extra Attack from multiple classes doesn't stack; you use the best single version (only Fighter 11+ grants 3 attacks).

**Q: Can a raging Barbarian cast or concentrate?** A: No. While raging you can neither cast spells nor concentrate on them — entering rage ends any concentration spell already running.

**Q: How many Sneak Attacks per round?** A: Once per **turn**, so an opportunity attack on an enemy's turn can trigger a second Sneak Attack in the same round.

**Q: Can a Paladin Divine Smite on a crit, and with warlock slots?** A: Yes and yes. Smite is declared after the hit, all smite dice double on a crit, and Pact Magic slots are legal fuel.

**Q: Do Stunning Strike and Flurry of Blows cost separate ki?** A: Yes — 1 ki each; a level-5 monk can spend 1 (Flurry) + 1 per Stunning Strike attempt on each hit.

**Q: Does a Warlock's 2nd-level slot cast a 1st-level spell at 1st level?** A: No — pact slots always cast at slot level; the spell is automatically upcast.

**Q: Does a Cleric need to prepare domain spells?** A: No — domain spells are always prepared and don't count against `WIS mod + level`.

**Q: Can a Druid cast while Wild Shaped?** A: Not until level 18 (Beast Spells). Concentration on a pre-cast spell continues in beast form.
