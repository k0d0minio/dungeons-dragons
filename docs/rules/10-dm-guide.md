# 10 — DM Guide: Running the Game

> Purpose: Give an AI assistant (and the human DM) everything needed to read a monster stat block, build a balanced encounter, improvise rulings, award XP and treasure, and run fast combat — with exact numbers from SRD 5.1 (2014 rules), matching the data served by the app's proxy (`/api/dnd5e/*` → dnd5eapi.co).

## Monster stat block anatomy

Every monster the app serves (`API: /api/2014/monsters`) follows the same block. Read it top to bottom; every field is listed here with what it means mechanically and where it lives in the API JSON.

### Header line: size, type, alignment

- **Size**: one of Tiny, Small, Medium, Large, Huge, Gargantuan. Determines space occupied in combat (Tiny 2½ ft., Small/Medium 5 ft., Large 10 ft., Huge 15 ft., Gargantuan 20 ft. or more) and grapple/shove eligibility (you can only grapple or shove a creature no more than one size larger than you). API: `size`.
- **Type**: aberration, beast, celestial, construct, dragon, elemental, fey, fiend, giant, humanoid, monstrosity, ooze, plant, or undead — plus an optional parenthetical **tag** like "(goblinoid)". Type has no rules of its own but is targeted by other rules (e.g. a ranger's favored enemy, spells that affect only humanoids). API: `type`, `subtype`.
- **Alignment**: descriptive default, not a rule. Any individual can differ. API: `alignment`.

### Armor Class (AC)

The number an attack roll must meet or beat. The block notes the source in parentheses — natural armor, worn armor (e.g. "chain mail"), or a shield. Monsters obey the same AC math as characters; you never need to recompute it. API: `armor_class` (an array — some monsters list multiple ACs for different forms or conditions).

### Hit Points and the HP formula

Listed as an average plus a dice formula, e.g. an ogre's `59 (7d10 + 5)`.

- The die size is fixed by monster size: Tiny d4, Small d6, Medium d8, Large d10, Huge d12, Gargantuan d20.
- The bonus is the monster's Constitution modifier × number of Hit Dice.
- **Use the average** for normal play; **roll the formula** when you want variance (e.g. a horde of goblins with mixed HP). Rolling is legal either way.
- API: `hit_points` (average), `hit_dice` (e.g. `7d10`), `hit_points_roll` (e.g. `7d10+5`).

### Speeds

Walking speed in feet, plus any of: **burrow**, **climb**, **fly** (with optional **hover** — a hovering flyer doesn't fall when knocked prone or having speed reduced to 0), **swim**. A creature using a movement mode it doesn't have listed pays the usual difficult-movement costs (e.g. climbing without a climb speed costs 2 ft. per 1 ft.). API: `speed` object.

### Ability scores

All six scores with modifiers. These drive everything not explicitly listed: an unlisted save uses the raw ability modifier; an unlisted skill check uses the raw modifier too. API: `strength` … `charisma` (scores only; derive modifier as `(score − 10) / 2`, round down).

### Saving throws and skills

Only **proficient** saves and skills are listed, already totaled (modifier + proficiency bonus, sometimes doubled for expertise-like bonuses). Anything not listed = bare ability modifier. API: `proficiencies` array — each entry references `saving-throw-*` or `skill-*` with a `value`.

### Vulnerabilities, resistances, immunities

- **Damage vulnerability**: takes **double** damage of that type.
- **Damage resistance**: takes **half** damage of that type (round down).
- **Damage immunity**: takes **zero** damage of that type.
- **Condition immunity**: the condition simply can't be applied.
- Common pattern: "bludgeoning, piercing, and slashing from nonmagical attacks" — this is one resistance entry with a qualifier; a magic weapon bypasses it.
- Multiple instances of resistance to the same damage **never stack** — damage is halved once.
- API: `damage_vulnerabilities`, `damage_resistances`, `damage_immunities`, `condition_immunities`.

### Senses and passive Perception

- **Blindsight X ft.**: perceives surroundings without sight within the radius (bats, oozes). Often paired with "(blind beyond this radius)".
- **Darkvision X ft.**: sees dim light as bright light and darkness as dim light (shades of gray) within the radius.
- **Tremorsense X ft.**: detects vibrations through a shared surface; useless against flying/incorporeal creatures.
- **Truesight X ft.**: sees in normal and magical darkness, sees invisible creatures, auto-detects visual illusions (and succeeds on saves against them), sees the true form of shapechangers, and sees into the Ethereal Plane.
- **Passive Perception**: `10 + Perception modifier`. This is the number you compare a hiding PC's Stealth roll against with no roll from the monster. Always listed.
- API: `senses` object, including `passive_perception`.

### Languages

Languages it speaks and/or understands; "—" means none. **Telepathy X ft.** appears here when present. API: `languages`.

### Challenge Rating and XP

CR estimates the threat to a party of **four characters of level = CR** (an appropriately equipped, well-rested party should defeat it without deaths). XP is fixed by CR (full table below). API: `challenge_rating`, `xp`, `proficiency_bonus`.

### Traits (special abilities)

Passive or always-on features printed above Actions — e.g. *Keen Smell* (advantage on Perception checks relying on smell), *Pack Tactics* (advantage on attacks when an ally is within 5 ft. of the target), *Magic Resistance* (advantage on saves vs. spells). Read these **before** combat starts; most monster identity lives here. API: `special_abilities`.

### Actions and Multiattack conventions

- Each entry is one action option. Attack entries follow a fixed grammar: *"Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage."* — attack bonus, reach or range, targets, then average damage with formula.
- **Multiattack** is itself an action: it specifies exactly which attacks and how many (e.g. "makes two attacks: one with its bite and one with its claws"). Multiattack **cannot** be split with other actions, cannot be used with Ready in most cases where the block says otherwise, and **cannot be taken as an opportunity attack** — an opportunity attack is always one melee attack.
- **Recharge (X–Y)**: after use, roll 1d6 at the start of the monster's turn; the ability recharges on X–Y (e.g. "Recharge 5–6" ≈ 33% per round). Breath weapons work this way.
- **Recharges after a Short or Long Rest**: exactly what it says; assume available in any given encounter.
- API: `actions` (with nested `multiattack_type`, `damage`, `dc`, `usage`), `reactions` for reaction entries.

### Legendary actions

A legendary creature gets **3 legendary actions per round**, usable **only at the end of another creature's turn**, **one at a time**, and regains all spent legendary actions **at the start of its own turn**. Some options cost 2 or 3 actions. It can't use them while incapacitated. This is the designed fix for the action-economy problem (see below). API: `legendary_actions`.

### Legendary Resistance

A trait, usually "Legendary Resistance (3/Day): If the dragon fails a saving throw, it can choose to succeed instead." Track uses; smart parties burn them with cheap save-or-suck spells before committing the big one.

### Lair actions

When fighting in its lair, a legendary creature takes a lair action **on initiative count 20 (losing initiative ties)**, and can't use the same lair action two rounds in a row. Lair actions live in the lair description, not the core stat block, and are **not** in the API monster payload — the DM supplies them.

### Regional effects

Passive environmental changes within 1–6 miles of a legendary creature's lair (fog, tainted water, unnaturally aggressive vermin…). They fade over days after the creature dies. Pure flavor-with-teeth; also not in the API payload.

> **2024 note:** 2024-revision stat blocks add an Initiative bonus line, fold saves into the ability table, and print average-only damage. The 2014 SRD layout above is what the API serves; treat it as canonical for this app.

## Challenge Rating → XP, and proficiency bonus by CR

(`API: /api/2014/monsters` — `xp` and `proficiency_bonus` are precomputed per monster; this table is the authority if you need CR math without a lookup.)

| CR | XP | Prof. | CR | XP | Prof. |
|---|---|---|---|---|---|
| 0 | 0 or 10* | +2 | 14 | 11,500 | +5 |
| 1/8 | 25 | +2 | 15 | 13,000 | +5 |
| 1/4 | 50 | +2 | 16 | 15,000 | +5 |
| 1/2 | 100 | +2 | 17 | 18,000 | +6 |
| 1 | 200 | +2 | 18 | 20,000 | +6 |
| 2 | 450 | +2 | 19 | 22,000 | +6 |
| 3 | 700 | +2 | 20 | 25,000 | +6 |
| 4 | 1,100 | +2 | 21 | 33,000 | +7 |
| 5 | 1,800 | +3 | 22 | 41,000 | +7 |
| 6 | 2,300 | +3 | 23 | 50,000 | +7 |
| 7 | 2,900 | +3 | 24 | 62,000 | +7 |
| 8 | 3,900 | +3 | 25 | 75,000 | +8 |
| 9 | 5,000 | +4 | 26 | 90,000 | +8 |
| 10 | 5,900 | +4 | 27 | 105,000 | +8 |
| 11 | 7,200 | +4 | 28 | 120,000 | +8 |
| 12 | 8,400 | +4 | 29 | 135,000 | +9 |
| 13 | 10,000 | +4 | 30 | 155,000 | +9 |

\* CR 0 creatures with no attacks are worth 0 XP; CR 0 creatures that can attack are worth 10 XP.

## Encounter building (2014 DMG method)

Four steps: (1) sum the party's XP thresholds, (2) sum monster XP, (3) multiply monster XP by the count multiplier to get **adjusted XP**, (4) compare adjusted XP to the thresholds. Adjusted XP is for **difficulty rating only** — award the *unadjusted* XP.

### Step 1 — XP thresholds per character level

| Level | Easy | Medium | Hard | Deadly |
|---|---|---|---|---|
| 1 | 25 | 50 | 75 | 100 |
| 2 | 50 | 100 | 150 | 200 |
| 3 | 75 | 150 | 225 | 400 |
| 4 | 125 | 250 | 375 | 500 |
| 5 | 250 | 500 | 750 | 1,100 |
| 6 | 300 | 600 | 900 | 1,400 |
| 7 | 350 | 750 | 1,100 | 1,700 |
| 8 | 450 | 900 | 1,400 | 2,100 |
| 9 | 550 | 1,100 | 1,600 | 2,400 |
| 10 | 600 | 1,200 | 1,900 | 2,800 |
| 11 | 800 | 1,600 | 2,400 | 3,600 |
| 12 | 1,000 | 2,000 | 3,000 | 4,500 |
| 13 | 1,100 | 2,200 | 3,400 | 5,100 |
| 14 | 1,250 | 2,500 | 3,800 | 5,700 |
| 15 | 1,400 | 2,800 | 4,300 | 6,400 |
| 16 | 1,600 | 3,200 | 4,800 | 7,200 |
| 17 | 2,000 | 3,900 | 5,900 | 8,800 |
| 18 | 2,100 | 4,200 | 6,300 | 9,500 |
| 19 | 2,400 | 4,900 | 7,300 | 10,900 |
| 20 | 2,800 | 5,700 | 8,500 | 12,700 |

Sum one row entry per character. **Easy** = resource tax, no real danger. **Medium** = a scare or two. **Hard** = could go badly; someone may drop. **Deadly** = potentially lethal.

### Step 2–3 — Encounter multipliers by monster count

| Monsters | Multiplier |
|---|---|
| 1 | ×1 |
| 2 | ×1.5 |
| 3–6 | ×2 |
| 7–10 | ×2.5 |
| 11–14 | ×3 |
| 15+ | ×4 |

**Party-size adjustment:** with **fewer than 3** characters, use the next multiplier **up** the table (a single monster counts ×1.5, etc.); with **6 or more**, use the next multiplier **down** (a single monster counts ×0.5). Skip trivially weak monsters (CR well below party level) when counting, at DM discretion.

> **2024 note:** the 2024 DMG replaces this entire method with flat XP budgets per character and **no multipliers**. This playbook uses the 2014 method; don't mix the two.

### Worked example

Party: four 3rd-level characters. Deadly threshold = 4 × 400 = **1,600**; Hard = 4 × 225 = **900**; Medium = **600**.

Encounter: 1 ogre (CR 2, 450 XP) + 4 goblins (CR 1/4, 50 XP each).
- Raw XP: 450 + 200 = **650**.
- 5 monsters → multiplier ×2 → adjusted XP = **1,300**.
- 1,300 sits between Hard (900) and Deadly (1,600) → a **Hard-to-Deadly** fight.
- XP actually awarded on victory: **650**, split among the party (162 each, round down or up consistently).

### Daily XP budget (the adventuring day)

A party can handle roughly this much **adjusted** XP per character per day, across 6–8 medium/hard encounters with about two short rests:

| Level | XP/day | Level | XP/day | Level | XP/day | Level | XP/day |
|---|---|---|---|---|---|---|---|
| 1 | 300 | 6 | 4,000 | 11 | 10,500 | 16 | 20,000 |
| 2 | 600 | 7 | 5,000 | 12 | 11,500 | 17 | 25,000 |
| 3 | 1,200 | 8 | 6,000 | 13 | 13,500 | 18 | 27,000 |
| 4 | 1,700 | 9 | 7,500 | 14 | 15,000 | 19 | 30,000 |
| 5 | 3,500 | 10 | 9,000 | 15 | 18,000 | 20 | 40,000 |

Few tables actually run 6–8 encounters; if you run 1–3 per day, push difficulty up a notch and expect casters to shine.

### Why action economy beats raw CR (the single-boss problem)

A lone CR-appropriate boss takes **1 turn per round** against a party taking **4+ turns per round**. Four PCs focus-fire, land one failed save (stun, restrain, banish), and the fight is over — the boss loses 25% of its total actions for every round of crowd control. CR assumes the monster gets to act; a solo monster often doesn't. Fixes, in order of effectiveness:

1. **Add minions.** 2–4 low-CR creatures (goblins beside an ogre) soak actions, threaten squishy PCs, and trigger the ×1.5–×2 multiplier honestly.
2. **Use legendary actions and Legendary Resistance** — that's what they exist for. For a homebrew boss, grafting "3 legendary actions: one attack, one move, one minor effect" onto any stat block is fair.
3. **Split the fight across waves or terrain** so the party can't alpha-strike round 1.
4. Never run a solo boss with a CR below the party's level and expect drama — it's a speed bump.

## Improvising rulings

### Setting DCs on the fly — the 10/15/20 heuristic

Ask "could a competent commoner do this?" and pick:

| DC | Difficulty | Use when |
|---|---|---|
| 5 | Very easy | Barely worth a roll — only if a fumble is funny/interesting |
| 10 | Easy | A trained person usually succeeds |
| 15 | Medium | The default. Real chance of failure for anyone |
| 20 | Hard | Experts fail regularly; heroic at low levels |
| 25 | Very hard | Near the limit of mundane ability |
| 30 | Nearly impossible | Levels 17+ with luck, or don't allow a roll |

Default to **10 / 15 / 20** and refuse to agonize. Announce the DC or not — but decide it *before* the roll.

### When to call for a check at all

Roll only when **both** are true: the outcome is **uncertain**, and **failure is interesting** (costs time, resources, position, or information — not just "try again"). Otherwise: auto-succeed if the character is competent and unhurried; auto-fail if it's impossible; use **passive scores** (10 + modifier) for always-on perception/insight and to preserve secrecy. Never let a failed check dead-end the plot — fail forward (they get in, but the guards know).

### Improvised damage by tier

| Severity | Levels 1–4 | Levels 5–10 | Levels 11–16 | Levels 17–20 |
|---|---|---|---|---|
| **Setback** (burned by coals, hit by a falling shelf) | 1d10 | 2d10 | 4d10 | 10d10 |
| **Dangerous** (lava splash, partial ceiling collapse) | 2d10 | 4d10 | 10d10 | 18d10 |
| **Deadly** (full lava immersion, crushed by walls) | 4d10 | 10d10 | 18d10 | 24d10 |

Offer a DEX or CON save for half where a dodge or endurance story makes sense (use the 10/15/20 heuristic for the DC).

## Awarding XP vs. milestone leveling

**XP method:** total the (unadjusted) XP of defeated/neutralized monsters and **split evenly** among all party members, present or contributing. "Defeated" includes routed, captured, or outwitted — killing is not required. Non-combat convention: award a trap, hazard, or social obstacle as if it were a monster of comparable CR; a session's clever pillar-of-play moments can earn an Easy-encounter's worth of XP. Character XP-by-level thresholds are in `11-quick-reference.md`.

**Milestone method:** the DM declares level-ups at story beats. No bookkeeping, party always in sync, pacing under DM control; the cost is losing XP as an incentive knob.

**Recommendation for this app's friends-and-family table:** use **milestone**, leveling every 2–3 sessions at levels 1–4 and every 3–4 sessions after. Small casual groups skip sessions unevenly; milestone keeps everyone identical in level and removes the #1 bookkeeping failure mode. Keep the XP tables anyway — the encounter math above still runs on XP.

## Treasure

The detailed DMG hoard tables are not in the SRD; the following is an SRD-safe restatement of their shape, tuned to the same totals.

### Individual treasure (pocket change per creature)

| CR tier | Typical carry per creature |
|---|---|
| CR 0–4 | ~3d6 cp / sp / gp scaled to creature (a few gp at most) |
| CR 5–10 | ~2d6 × 10 sp to 2d6 × 10 gp |
| CR 11–16 | ~4d6 × 100 gp equivalent, mixed gp/pp |
| CR 17+ | ~2d6 × 1,000 gp equivalent, gp/pp and small gems |

### Hoards (per adventure arc, not per fight)

| Tier (party level) | Rough hoard value | Magic items per hoard |
|---|---|---|
| 1 (levels 1–4) | ~500–1,500 gp incl. gems/art | 0–2, common/uncommon |
| 2 (levels 5–10) | ~5,000–15,000 gp | 1–3, uncommon/rare |
| 3 (levels 11–16) | ~30,000–60,000 gp | 2–4, rare/very rare |
| 4 (levels 17–20) | ~100,000+ gp | 2–4, very rare/legendary |

Budget **one hoard roughly per level gained**. Consumables (potions, scrolls — `API: /api/2014/magic-items`) are free extras; hand them out liberally, they self-balance by being spent.

### Magic item rarity by character level

| Rarity | Appropriate from level | Sale value guideline |
|---|---|---|
| Common | 1st | 50–100 gp |
| Uncommon | 1st | 101–500 gp |
| Rare | 5th | 501–5,000 gp |
| Very rare | 11th | 5,001–50,000 gp |
| Legendary | 17th | 50,001+ gp |

Attunement caps each character at **3 attuned items** — this is the real balance valve, not scarcity.

## NPC quick-build

- **Default: reuse a monster stat block.** Any humanoid block reskins freely — a "bandit captain" block is also a mercenary leader, corrupt sheriff, or pirate. Swapping weapon flavor or damage type between equals doesn't change CR. (`API: /api/2014/monsters` has generic NPC blocks: commoner, bandit, guard, thug, acolyte, cultist, knight, mage, priest, veteran, assassin.)
- **Three-stats shortcut** for NPCs who might roll but won't fight: pick a good/medium/bad spread like +3 / +1 / −1, assign to the three ability *groups* (physical STR/DEX/CON, mental INT/WIS/CHA as fits the concept), give AC 10–13 and HP 4–20 by toughness. Done.
- Personality: one **want** + one **quirk** (see prep checklist). Never stat what will never be rolled.

## Running combat fast

- **Initiative:** roll once, write the order somewhere visible, and note *round number* — durations ("1 minute" = 10 rounds) and recharge rolls depend on it. Group identical monsters into one initiative count and one shared turn.
- **Average damage, not rolls**, for groups of 3+ monsters (`hit_points`/damage averages are precomputed in the API payload). Roll dice for bosses and crits — the drama is worth the seconds.
- **Declare-then-resolve:** ask the next player to think while the current one resolves. A turn should take under a minute.
- **Morale:** unless fanatical, mindless, or cornered, creatures **flee or surrender below ~25–30% HP** or when their leader falls. This is a pacing tool as much as realism — it ends decided fights immediately. When unsure, have the creature make a DC 10 WIS save to hold.
- **Describe hits without numbers:** track exact HP privately; narrate state in three bands — *unhurt*, *bloodied* (below half), *staggering* (below quarter). Players get information, monsters keep mystery, and nobody meta-games exact HP.
- **Track only what matters:** conditions and concentration on index cards or the app; everything else is theater.

## Session prep checklist (reusable template)

An AI prep assistant should emit exactly this structure, filled in:

```markdown
## Session N prep — <date>
1. STRONG START — one sentence of in-media-res action or a hard hook.
2. SCENES (3–5) — one line each; expect to use 3, keep 2 in reserve.
3. SECRETS & CLUES (10) — one-line facts the party *could* learn.
   Location-agnostic: any clue can surface anywhere.
4. NPCs — name · want · quirk (one line each; 3–6 NPCs).
5. LOCATIONS — name + three sensory/tactical details each.
6. MONSTERS — stat block refs (`/api/2014/monsters/<index>`) + adjusted-XP check
   against the party's thresholds.
7. REWARDS — treasure/magic items/story rewards on offer this session.
```

Rules for the filler: secrets are facts, not scenes (the party finds them in any order); scenes are situations, not scripts; every NPC want should be achievable *through* the party or *against* them.

## Safety and table tools

Agree on **lines** (content that never appears) and **veils** (content that happens off-screen) once, before the campaign; honor them without discussion mid-game. That's the whole tool.

## Pacing and spotlight

- Rotate the spotlight deliberately: in each session, every player should get at least one scene aimed at their character's skills or story. Track it in prep (the NPC/scene lists above make this trivial).
- Cut scenes early: when the decision is made or the information delivered, jump-cut to the next scene. Dead air kills momentum faster than any bad ruling.
- When energy dips, trigger the strong start of your next reserve scene — something *happens to* the party rather than waiting for them.
