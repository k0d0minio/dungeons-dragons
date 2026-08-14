# 09 — Adventuring

> Purpose: Exact SRD 5.1 rules for the exploration and social pillars — time, travel, resting, light, hazards, traps, social checks, and downtime — as testable statements for tool-building (DND-008/009) and table reference.

## Time scales

| Unit | Length | Used for |
|---|---|---|
| **Round** | 6 seconds | Combat; 10 rounds = 1 minute |
| **Minute** | 60 seconds | Short tasks: picking a lock, searching a room |
| **Hour** | 60 minutes | Travel legs, short rests, watches |
| **Day** | 24 hours (≈8 h travel) | Overland travel, downtime, rations |

(`API: /api/2014/rule-sections/time`)

## Travel

### Travel pace

| Pace | Per minute | Per hour | Per day (8 h) | Effect |
|---|---:|---:|---:|---|
| **Fast** | 400 ft | 4 miles | 30 miles | **−5 penalty to passive Perception** |
| **Normal** | 300 ft | 3 miles | 24 miles | — |
| **Slow** | 200 ft | 2 miles | 18 miles | Able to use **Stealth** |

- **Difficult terrain**: overland speed is **halved** (as in combat: each foot costs 2).
- **Forced march**: for each hour of travel **beyond 8 hours** in a day, each creature makes a **Constitution save at the end of the hour, DC 10 + 1 per hour past 8** (hour 9 → DC 11, hour 10 → DC 12 …). Failure = **1 level of exhaustion**.

### Mounts and vehicles

| Means | Speed / pace | Notes |
|---|---|---|
| Pony / draft horse / mastiff / elephant | 40 ft | |
| Camel | 50 ft | |
| Riding horse / warhorse | 60 ft | |
| Mounted gallop | double pace for 1 hour | Mounts can be swapped at way-stations for sustained ~fast pace |
| Rowboat | 1.5 mph | |
| Keelboat | 1 mph | Can crew in shifts to travel 24 h/day |
| Sailing ship | 2 mph | 24 h/day with crew |
| Warship | 2.5 mph | |
| Longship | 3 mph | |
| Galley | 4 mph | |

Water vehicles ignore pace choices (no fast/slow) and are not affected by forced march. Carrying capacity of beasts: a mount carries up to **15 × Strength score** in lb (standard capacity rule). (`API: /api/2014/equipment-categories/mounts-and-vehicles`)

### Activities while traveling

Each character contributes **one** travel activity; anyone doing an activity below is **not** watching for danger (no passive Perception contribution against surprise):

| Activity | Check / rule |
|---|---|
| Navigate | Wisdom (Survival) — see Getting lost below |
| Draw a map | No check; grants advantage on checks to retrace the route |
| Track | Wisdom (Survival) — see Tracking below |
| Forage | Wisdom (Survival) — see Foraging below |
| Stealth (whole group) | Only at **slow pace**; group Dexterity (Stealth) vs passive Perception |
| Watch for danger | Default; passive Perception applies (−5 at fast pace) |

### Special movement while exploring

- **Climbing / swimming / crawling**: each foot costs **1 extra foot** (2 extra in difficult terrain). A difficult climb surface may require a **Strength (Athletics)** check (typical DC 10–15; slippery/overhanging 15–20).
- **Long jump**: with a 10-ft run-up, jump up to **Strength score** in feet (half that from standing). Clearing a low obstacle mid-jump: **DC 10 Strength (Athletics)**. Landing in difficult terrain: **DC 10 Dexterity (Acrobatics)** or land prone.
- **High jump**: with a 10-ft run-up, jump **3 + Strength modifier** feet up (half from standing); reach = jump height + 1.5 × character height.
- Jump distance still consumes movement; you can't jump farther than your remaining speed.

### Long-distance swimming, flying, and splitting the party

- **Swimming for hours**: a creature without a swim speed must succeed on a **DC 10 Constitution save for each hour** of sustained swimming or gain 1 exhaustion. Daily distance uses the normal pace table at half effective speed; forced-march rules apply past 8 hours.
- **Flying travel**: use the flier's speed against the pace table (60-ft fly ≈ 6 mph fast pace); most flying mounts must land periodically — convention: 1 hour of rest per 3 hours flown for living mounts.
- **Splitting the party**: run each group's travel/encounter clock separately; a lone messenger moving between groups uses the pace table. Mechanically legal, tactically discouraged.
- **Carrying an incapacitated ally**: their weight counts against carrying capacity (Str × 15 lb); dragging beyond capacity caps speed at 5 ft. A two-person carry splits the weight.

### Navigation, marching order, foraging, tracking

- **Marching order**: declare front/middle/rear ranks. Only characters in a rank exposed to a threat can notice or be targeted by it; the navigator, mapper, and forager each do only one travel task.
- **Getting lost**: the navigator makes a **Wisdom (Survival) check** when the DM rules terrain threatens it. Convention (DMG-derived DCs): open plains or coastline **DC 5–10**; forest, hills, or featureless desert/sea **DC 15**; dense jungle, swamp, or magical distortion **DC 20**. Failure: the party travels a wrong direction for 1d6 hours before a re-check.
- **Foraging**: **Wisdom (Survival)**, DC **10** abundant food/water, **15** limited, **20** very little. Success yields **1d6 + Wis modifier lb of food** and the **same in gallons of water** per day of foraging (forager travels at slow or normal pace).
- **Tracking**: **Wisdom (Survival)**; typical DCs: soft ground/snow 10, dirt/grass 15, bare stone 20; +5 if the trail is days old, −5 for a large group or blood trail.

## Resting

(`API: /api/2014/rule-sections/resting`)

### Short rest

- **≥1 hour** of light activity: eating, drinking, reading, tending wounds. Interruption by combat or strenuous activity restarts it.
- Spend any number of **Hit Dice** (max = character level in that class total). For each die spent: roll it and **add Con modifier**; regain that many HP. Decide after each roll whether to spend another.
- No Hit Dice are regained by a short rest.

### Long rest

- **≥8 hours**: at least **6 h sleep** and ≤2 h light activity (watch counts as light activity). It is broken only by **≥1 hour** of walking, fighting, spellcasting, or similar strenuous activity — a short fight does **not** reset it.
- On finish: regain **all lost HP**, and regain spent Hit Dice up to **half your total Hit Dice (minimum 1)**.
- Limits: **once per 24 hours**, and you must have **≥1 HP at the start** of the rest to benefit (stabilized-at-0 characters must first regain a hit point).

### What recovers on which rest (summary)

| Resource | Short rest | Long rest |
|---|---|---|
| HP via Hit Dice | Yes (spend dice) | All HP, free |
| Hit Dice pool | — | Regain half total (min 1) |
| Spell slots (bard, cleric, druid, paladin, ranger, sorcerer, wizard) | — | All |
| **Warlock** pact slots | **All** | All |
| Wizard **Arcane Recovery** | Once/day: slots totaling ≤ half wizard level (rounded up) | resets |
| Fighter Second Wind / Action Surge | Yes | Yes |
| Monk ki points | **All** | All |
| Barbarian rages, bardic inspiration (pre-subclass), Channel Divinity uses¹, sorcery points | — (¹Channel Divinity: short **or** long) | All |
| Druid Wild Shape | Yes (2 uses) | Yes |
| Exhaustion | — | **−1 level** (needs food & drink) |

> **2024 note:** the revision lets a long rest also reset "once per day" abilities explicitly, gives Bardic Inspiration back on short rest at higher levels, and makes an interrupted long rest lose only an hour of progress. Under SRD 5.1 use the table above.

## Food and water

| Need | Per day | Shortfall consequence |
|---|---|---|
| **Food** | 1 lb | Can go **3 + Con modifier days** (min 1) without food; after that, **+1 exhaustion per day**. Half rations = half a day without food. A normal day of eating resets the count to zero. |
| **Water** | 1 gallon (2 in hot weather) | Half ration: **DC 15 Con save** or 1 exhaustion at day's end. Less than half: **automatic 1 exhaustion** (2 if the creature already has exhaustion levels). |

Exhaustion from thirst/starvation can only be removed by a long rest **after** eating and drinking normally.

### Exhaustion (referenced by forced march, food/water, heat/cold, frigid water)

(`API: /api/2014/conditions/exhaustion`) Effects are **cumulative** — a creature at level 3 suffers levels 1–3. A long rest (with food and drink) removes **one** level; *greater restoration* removes one level.

| Level | Effect |
|---:|---|
| 1 | Disadvantage on ability checks |
| 2 | Speed halved |
| 3 | Disadvantage on attack rolls and saving throws |
| 4 | Hit point maximum halved |
| 5 | Speed reduced to 0 |
| 6 | **Death** |

> **2024 note:** the revision replaces this table with a flat −2 to d20 rolls and DCs per level, still dying at level 6. SRD 5.1 data (and `/api/2014/conditions`) uses the table above.

### Poison and disease basics

- Poison delivery types: **contact** (touch, skin), **ingested** (eaten/drunk), **inhaled** (breathed, 5-ft cube, holding breath does **not** protect — it affects on contact with membranes by common ruling; RAW: holding breath is ineffective), **injury** (enters via a wound; applied to a weapon it dries/expires after 1 minute or one hit).
- Typical pattern: **Con save** vs the poison's DC; failure = **poisoned** condition (disadvantage on attack rolls and ability checks) and/or damage, with a repeat save to end.
- **Diseases** are bespoke: each defines infection vector, incubation, save DC, and effects. *Lesser restoration* ends **one disease or one condition** among blinded, deafened, paralyzed, or poisoned.
- The **poisoner's kit** (50 gp) grants proficiency on checks to craft/handle poison; basic poison (vial, 100 gp) coats one weapon: DC 10 Con save or +1d4 poison, dries after 1 minute.

## Camping, watches, and sleep

- A long rest needs **≥6 h of sleep** inside the 8 h, so a party of 4+ can rotate 2-hour watches and everyone still completes the rest (each stands ≤2 h of light activity).
- Party of 3: three watches of 2h40m each still fits. Party of 2: 4-hour watches each — still legal (4 h awake ≤ 2 h light activity is **violated**; convention: most tables allow it, strict RAW says a 2-person party can't both watch half the night and long rest — flag to the DM).
- A **sleeping** creature is **unconscious**: attacks against it have advantage, and melee hits within 5 ft are automatic critical hits. Noise or damage wakes a sleeper (natural sleep, not magical).
- **Elves (trance)**: 4 hours of semiconscious meditation gives the benefit of a full night's sleep; the long rest itself still takes the full 8 hours of light activity by RAW convention.

## Weather (quick reference)

| Condition | Mechanical effect |
|---|---|
| Heavy precipitation | Lightly obscured area; disadvantage on Wisdom (Perception) relying on sight or hearing; open flames doused |
| Strong wind | Disadvantage on ranged weapon attacks and hearing-based Perception; open flames doused, fog dispersed; flying by Tiny/Small creatures near-impossible (DM's call) |
| Extreme heat / cold | See Environmental hazards below |

## Vision and light

(`API: /api/2014/conditions` for blinded; `/api/2014/rule-sections/the-environment`)

- **Bright light**: normal vision. Most creatures see normally.
- **Dim light** (shadows): area is **lightly obscured**.
- **Darkness**: area is **heavily obscured**.
- **Lightly obscured** (dim light, patchy fog, moderate foliage): **disadvantage on Wisdom (Perception) checks that rely on sight**.
- **Heavily obscured** (darkness, opaque fog, dense foliage): vision is **blocked entirely** — a creature effectively suffers the **blinded** condition when looking into or through it.
- **Blindsight** (radius): perceive surroundings without sight within the radius.
- **Darkvision** (radius): treat **darkness as dim light** and **dim light as bright light** within the radius; **can't discern color** in darkness.
- **Tremorsense** (radius): detect vibrations through a shared surface; useless vs airborne creatures.
- **Truesight** (radius): see in normal and magical darkness, see invisible creatures/objects, auto-detect visual illusions (succeed on saves against them), perceive shapechangers'/transmuted true form, and see into the Ethereal Plane.

### Light sources

| Source | Bright | Dim (additional) | Duration |
|---|---:|---:|---|
| Candle | 5 ft | +5 ft | 1 hour |
| Torch | 20 ft | +20 ft | 1 hour |
| Lamp | 15 ft | +30 ft | 6 h / oil flask |
| Lantern, hooded | 30 ft | +30 ft | 6 h / flask (hooded: dim 5 ft only) |
| Lantern, bullseye | 60-ft cone | +60-ft cone | 6 h / flask |
| Campfire | 20 ft | +20 ft | while fed |
| *Light* cantrip | 20 ft | +20 ft | 1 hour |
| *Continual flame* | 20 ft | +20 ft | permanent |

## Environmental hazards

- **Falling**: **1d6 bludgeoning per 10 ft fallen, max 20d6**; the creature lands **prone** unless it avoids all damage.
- **Suffocation**: a creature can **hold its breath for 1 + Con modifier minutes (minimum 30 seconds)**. When out of breath (or choking), it survives **Con modifier rounds (minimum 1)**; at the start of its next turn after that, it **drops to 0 HP and is dying**, and it can't regain HP or be stabilized until it can breathe.
- **Extreme cold** (≤0 °F / −18 °C): **DC 10 Con save at the end of each hour** or gain 1 exhaustion. Immune: cold resistance/immunity, or dressed in cold-weather gear.
- **Extreme heat** (≥100 °F / 38 °C, without water): Con save at the end of each hour, **DC 5 + 1 per previous hour**, or gain 1 exhaustion. **Disadvantage** on the save in medium/heavy armor or heavy clothing; immune with fire resistance/immunity.
- **Frigid water**: immersion is survivable for **Con modifier minutes** (min 1); after that, **DC 10 Con save per additional minute** or gain 1 exhaustion (cold-adapted or resistant creatures immune).
- **High altitude** (≥10,000 ft): each travel hour counts as **2 hours** toward daily limit and forced-march thresholds. **30 days** at altitude acclimates a creature to that elevation; **no acclimation above 20,000 ft** for ordinary creatures.
- **Underwater**: without a swim speed, each foot of swimming costs **2 ft** of speed. **Melee weapon attacks are at disadvantage** unless the attacker has a swim speed or uses a **dagger, javelin, shortsword, spear, or trident**. **Ranged weapon attacks automatically miss beyond normal range**; within normal range they are at **disadvantage** unless the weapon is a **crossbow, net, or thrown-like-a-javelin** weapon. Fully submerged creatures have **resistance to fire damage**.

### Objects — AC and HP guidance (breaking things)

Objects are immune to poison and psychic damage; auto-fail Str/Dex saves is the usual ruling for unattended objects.

| Substance | AC |
|---|---:|
| Cloth, paper, rope | 11 |
| Crystal, glass, ice | 13 |
| Wood, bone | 15 |
| Stone | 17 |
| Iron, steel | 19 |
| Mithral | 21 |
| Adamantine | 23 |

| Object size | Fragile HP | Resilient HP |
|---|---:|---:|
| Tiny (bottle, lock) | 2 (1d4) | 5 (2d4) |
| Small (chest, lute) | 3 (1d6) | 10 (3d6) |
| Medium (barrel, chandelier) | 4 (1d8) | 18 (4d8) |
| Large (cart, 10×10 window) | 5 (1d10) | 27 (5d10) |

Huge+ objects: track HP by 10-ft sections, or set a damage threshold. Alternative to HP: allow a **Strength check** to burst/break (e.g. DC 17 to snap rope, DC 20 to break an iron bar).

### Interacting with objects and doors

- One **free object interaction** per turn (draw a sword, open an unlocked door); a second interaction costs the **Use an Object action**.
- **Stuck door**: Strength check, typical DC 10–15 (add +5 if barred). **Locked door**: Dexterity check with **thieves' tools** (DC 15 typical lock, 20 good, 25 superior) or break it (see object AC/HP above; typical wooden door AC 15, HP 18; iron-bound AC 15–19, HP 27).
- **Listening at a door**: Wisdom (Perception), DC set by noise (quiet talk DC 15, argument DC 10).
- Forcing anything is **loud**: convention is one random-encounter check per forced door or smashed chest in occupied dungeons.

## Traps

Anatomy of every trap, in order: **trigger** (what sets it off) → **detection** (usually Wisdom (Perception) or Intelligence (Investigation) vs a DC) → **disarm** (usually Dexterity check with **thieves' tools** vs a DC; *mage hand*/wedging/avoidance also count) → **effect** (attack roll or saving throw, plus damage/condition).

| Severity | Save DC | Attack bonus |
|---|---|---|
| Setback | 10–11 | +3 to +5 |
| Dangerous | 12–15 | +6 to +8 |
| Deadly | 16–20 | +9 to +12 |

| Character level | Setback | Dangerous | Deadly |
|---|---|---|---|
| 1–4 | 1d10 | 2d10 | 4d10 |
| 5–10 | 2d10 | 4d10 | 10d10 |
| 11–16 | 4d10 | 10d10 | 18d10 |
| 17–20 | 10d10 | 18d10 | 24d10 |

- Convention: a hidden trap's detection DC equals its build quality (10 crude, 15 typical, 20 masterwork); passive Perception spots it only if the character would reasonably pass near the trigger.
- Announcing "I search the floor ahead as we go" = travel at **slow pace** with active checks; otherwise compare passive Perception.

## Social interaction

- **Attitudes**: an NPC is **hostile** (opposes/harm), **indifferent** (self-interested), or **friendly** (helps if low-cost). Roleplay and offers shift attitude; checks resolve *requests*, not attitude itself.
- Flow: players roleplay the approach → DM sets the NPC's attitude and what would move them → **one** Charisma check (if the outcome is uncertain) resolves the request, with advantage/disadvantage from the roleplay and leverage.
- **Persuasion**: honest requests made in good faith (negotiate, request aid, formal diplomacy).
- **Deception**: any claim the speaker knows is false or misleading (con, disguise story, bluff); typically opposed by **Wisdom (Insight)**.
- **Intimidation**: compliance through threat (overt or implied). Works fast but usually degrades attitude one step afterward.
- DC convention by attitude for a reasonable request: friendly **10**, indifferent **15**, hostile **20**; impossible asks (act against core interests) need leverage, not a roll.
- Never roll to change a **player's** mind; social skills target NPCs.

### Group checks and helping

- **Group check** (used when the whole party succeeds or fails together, e.g. group Stealth, group Survival to avoid quicksand): everyone rolls; if **at least half** succeed, the group succeeds.
- **Working together (Help)**: one character makes the check with **advantage**, the helper must plausibly be able to attempt/assist the task. Only one check is rolled — do not let every party member roll the same Persuasion.
- **Passive check** = **10 + all modifiers** (advantage +5, disadvantage −5). Use for always-on senses (passive Perception vs Stealth) and for repeated-task averages.

## Downtime activities

(`API: /api/2014/rule-sections/between-adventures`)

| Activity | Rate / rule |
|---|---|
| **Crafting** | Requires proficiency with relevant tools + raw materials worth **half** market price. Progress: **5 gp of item value per day** per character; multiple proficient characters can pool days. Items >5 gp accrue in 5 gp steps. |
| **Practicing a profession** | Maintain a **modest** lifestyle at no cost (comfortable if a guild/organization applies; wealthy for star performers, Performance DC 20+ context). |
| **Recuperating** | 3 lifestyle days of rest, then **DC 15 Con save**: on success, either **end one effect** preventing HP recovery, or gain **advantage on saves vs one disease or poison** currently affecting you for 24 h. |
| **Researching** | ~**1 gp per day** in expenses; after a number of days the DM sets, gain accurate lore/leads on the topic. No check by default — money and time buy answers. |
| **Training** (language or tool proficiency) | **250 days** total at **1 gp per day**; a teacher must be available. Days need not be consecutive. |

Madness and sanity variant rules are **out of scope** for this playbook.

### Between-adventure lifestyle interactions

- Lifestyle expenses (see `08-equipment.md`) are paid per downtime day; **practicing a profession** offsets a modest lifestyle entirely.
- Convention for the app: downtime tracking is a DM-facing concern — DND-008/009 need only rations, water, light sources, and Hit Dice as consumable counters; downtime gp math stays in session notes.

## Common table rulings

- **Q: Does an hour-long short rest heal anything automatically?** A: No. HP comes only from Hit Dice you choose to spend (roll + Con mod each) or from features/spells used during the rest.
- **Q: We got ambushed 5 hours into a long rest — is it ruined?** A: Only if the interruption involved ≥1 hour of fighting/walking/strenuous activity. A short fight interrupts but doesn't reset; resume and complete the remaining hours.
- **Q: Can we take two long rests in a day to double spell slots?** A: No — one long rest benefit per 24 hours, hard rule.
- **Q: How far can the party see by torchlight?** A: Clearly within 20 ft (bright); 20–40 ft is dim light, so Perception-by-sight checks there are at disadvantage.
- **Q: Does darkvision mean the rogue sees fine in a pitch-black dungeon?** A: They treat darkness as dim light within their radius — so no light needed to move, but sight-based Perception is at disadvantage and everything is monochrome.
- **Q: The wizard fell 200 ft — how much damage?** A: 20d6 bludgeoning (the max; 1d6 per 10 ft caps at 20d6), and they land prone if any damage gets through.
- **Q: How long can the fighter (Con 14) hold their breath?** A: 3 minutes (1 + Con mod). After that they survive 2 more rounds, then drop to 0 HP and are dying at the start of their next turn.
- **Q: Can the barbarian just smash the locked door instead of picking it?** A: Yes — wooden door: AC 15, roughly 18 HP (Medium resilient), or allow a Strength check (typical DC 15–20). It is loud; roll for wandering monsters accordingly.
- **Q: We're out of rations on day 4 — when does starvation bite?** A: A character with Con +1 lasts 4 full days (3 + Con mod) with no food; each day after that adds 1 exhaustion. One normal day of eating resets the counter.
- **Q: Everyone rolls Stealth and the wizard gets a 3 — are we spotted?** A: Use a group check for group sneaking: if at least half the party beats the enemy's passive Perception, the whole group stays hidden.
- **Q: Can we forage while traveling at a fast pace?** A: No — foraging requires slow or normal pace, and the forager contributes nothing to watching for danger that day.
