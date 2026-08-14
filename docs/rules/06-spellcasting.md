# 06 — Spellcasting

> Purpose: The complete SRD 5.1 spellcasting rules as exact, testable statements — slot tables, the concentration state machine, action-economy constraints, and targeting — for AI assistants building the character sheet's spell-slot and concentration tracking (DND-009), DMs, and players.

Baseline: SRD 5.1 (2014 rules). All spell data referenced here is served by the app's proxy (`API: /api/2014/spells`, `/api/2014/spells/{index}`, `/api/2014/classes/{class}/spells`, `/api/2014/magic-schools`).

## Anatomy of a spell

Every spell record has these fields (mirrored 1:1 by `API: /api/2014/spells/{index}`):

| Field | Meaning | Testable rule |
|---|---|---|
| **Level** | 0 (cantrip) through 9 | Casting requires a slot of this level **or higher** (cantrips need no slot) |
| **School** | One of 8: abjuration, conjuration, divination, enchantment, evocation, illusion, necromancy, transmutation | No inherent mechanics; referenced by other features (`API: /api/2014/magic-schools`) |
| **Casting time** | 1 action / 1 bonus action / 1 reaction / minutes / hours | Determines which turn resource it consumes; >1-action spells require your action **each turn** and **concentration** during the whole cast — losing it wastes the spell (no slot spent until completed) |
| **Range** | Self / Touch / a distance / Sight / Unlimited | Target(s) or point of origin must be within range at cast time |
| **Components** | V, S, M | See Components |
| **Duration** | Instantaneous / rounds / minutes / hours / "Concentration, up to X" | "Concentration" durations engage the concentration state machine |

### Components

- **Verbal (V):** you must be able to **speak** and produce audible sound. A gagged caster or one in a *silence* area cannot cast V spells.
- **Somatic (S):** you need **at least one free hand** to perform the gestures.
- **Material (M):** you need the listed materials, **or** a **component pouch**, **or** a **spellcasting focus** (if your class can use one) — *except*:
  - Components with a listed **gp cost** are **never** substituted by pouch/focus — you must own the actual item (e.g. *revivify*: diamonds worth 300 gp).
  - Components the spell says are **consumed** are used up each cast; non-consumed costed components are reusable.
- Handling materials/focus requires a **free hand**, but it **can be the same hand** used for somatic components. A spell with S but no M needs a hand free of everything.
- A caster with a weapon and shield and no free hand cannot perform S components (common pain point — War Caster-style feats fix it, but that feat is not in the SRD).

## Cantrips

- **Level 0**, known permanently, cast **at will** — no slot, no daily limit.
- Damage cantrips scale with **character level** (total, not class level):

| Character level | Damage dice multiplier | Example: *fire bolt* |
|---|---|---|
| 1–4 | ×1 | 1d10 |
| 5–10 | ×2 | 2d10 |
| 11–16 | ×3 | 3d10 |
| 17–20 | ×4 | 4d10 |

- Sheet rule: cantrip scaling keys off `characterLevel`, never `classLevel` and never spell slot level.

## Spell slots

A **spell slot** is the expendable resource for casting a leveled spell. Casting a spell of level N expends **one slot of level N or higher**.

- **Upcasting:** using a higher slot casts the spell **at that slot's level**; the spell's "At Higher Levels" text (present in the API payload as `higher_level`) defines the benefit. No text = no benefit, but the slot is still legal to use.
- The spell's **level for all rule interactions** (e.g. *dispel magic* thresholds) is the **slot level it was cast with**.
- All slots return on a **long rest** (Pact Magic excepted — short rest, below).

### Full-caster slot table (bard, cleric, druid, sorcerer, wizard)

`API: /api/2014/classes/{class}/levels` carries this per class.

| Class level | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th | 9th |
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

**Half-casters** (paladin, ranger) progress at half rate (start slots at class level 2, max 5th-level slots at 17). Use the per-class level tables from the API rather than deriving.

## Known vs prepared casters

Two mutually exclusive models; the sheet must implement both:

| Model | Classes | List size | Can change |
|---|---|---|---|
| **Prepared** | Cleric, Druid, Wizard, Paladin | `casting ability modifier + class level` (Cleric/Druid: Wis; Wizard: Int) — **Paladin:** `Cha modifier + half paladin level (round down)`; minimum 1 in all cases | Whole list, after any **long rest** (1 min/spell level per changed spell of prayer/study) |
| **Known** | Bard, Ranger, Sorcerer, Warlock | Fixed number from the class table (`API: /api/2014/classes/{class}/levels` → `spellcasting.spells_known`) | **One** spell swapped on **level-up** only |

- Prepared casters choose from their **entire class list** (cleric, druid, paladin) or their **spellbook** (wizard). Known casters choose from their class list at level-up.
- **Cantrips are always "known"** and never prepared, for every class; they change only when a feature says so.
- Preparing a spell doesn't consume anything; casting it doesn't unprepare it — a prepared spell can be cast any number of times while slots last.
- **Wizard spellbook:** starts with 6 first-level spells; +2 spells of castable level per wizard level; can copy found spells (2 hours + 50 gp per spell level). Prepared subset comes from the book.

## Rituals

- A spell with the **ritual tag** (API field `ritual: true`) can be cast as a ritual by a class with the Ritual Casting feature: **Bard, Cleric, Druid, Wizard**.
- Ritual casting: **+10 minutes** on top of the normal casting time, **no spell slot expended**, spell is cast at its **base level** (no upcasting).
- The caster must have the spell **prepared/known** — except the **wizard**, who can ritual-cast any ritual **in the spellbook** without preparing it.
- Rituals still require components and (if the duration says so) concentration during and after casting.

## Warlock Pact Magic

A separate slot system, tracked apart from standard slots:

| Warlock level | Slots | Slot level |
|---|---|---|
| 1 | 1 | 1st |
| 2 | 2 | 1st |
| 3–4 | 2 | 2nd |
| 5–6 | 2 | 3rd |
| 7–8 | 2 | 4th |
| 9–10 | 2 | 5th |
| 11–16 | 3 | 5th |
| 17–20 | 4 | 5th |

- **All Pact Magic slots are the same level**; every leveled warlock spell is automatically cast at that level.
- Slots refresh on a **short or long rest**.
- **Multiclassing:** Pact Magic slots and Spellcasting slots are **separate pools** that coexist on one sheet. Either pool's slots can cast spells known from either class; the pools recover on their own schedules (short rest vs long rest). Multiclass Spellcasting slot level is determined by the combined-caster-level table, which **excludes** warlock levels.
- Sheet model: `slots: { standard: {1: n, …, 9: n}, pact: { count, level } }`.

## Casting in armor

You must be **proficient** with the armor you wear to cast **any** spell. Non-proficient armor = too hampered to cast (this is absolute, not a penalty).

## Concentration — state machine

State per creature: `concentratingOn: spellInstance | null`.

**Enter:** casting a spell whose duration reads "Concentration, up to X" sets `concentratingOn` (also: some non-spell effects, and holding a **readied spell**, require concentration).

**Exit — the spell/effect ends immediately — on ANY of:**

| Trigger | Rule |
|---|---|
| Cast another concentration spell | The old one ends the moment the new casting begins (even if the new one fails or is counterspelled — you committed). One concentration effect at a time, ever. |
| **Take damage** | **Constitution saving throw, DC = max(10, floor(damage / 2))**. Fail → concentration breaks. Roll **once per separate source of damage**: three arrows in a round = three saves, each DC from its own damage. |
| **Incapacitated** or **dead** | Automatic break, no save (this includes stunned, paralyzed, unconscious — they contain incapacitated). |
| Voluntary drop | **Free**: no action, no reaction, usable at **any time**, including on other creatures' turns. |
| Environmental chaos (DM) | The DM can call for **DC 10 Con save** for things like a wave crashing over you. |
| Duration expires | Normal end. |

- Concentration does **not** stop you from attacking, moving, or casting **non**-concentration spells.
- Damage reduced to 0 (e.g. fully absorbed, immunity) forces **no save** — no damage taken.
- Sheet implementation: on `applyDamage(target, amount, sourceId)`, if `target.concentratingOn != null && amount > 0`, queue a Con save at `DC = max(10, floor(amount/2))` per damage instance; on fail set `concentratingOn = null` and end the effect.

## Casting time and the action economy

- **1 action:** the default; consumes your action.
- **1 bonus action:** consumes your bonus action, **and triggers the bonus-action spell rule:**

**The bonus-action spell rule (exact 2014 wording, commonly misquoted):** if you cast **any** spell as a **bonus action**, the only other spell you can cast **during that same turn** is a **cantrip with a casting time of 1 action**. The constraint is triggered by the bonus-action spell, regardless of either spell's level — *healing word* (bonus) + *fire bolt* (action cantrip) is legal; *healing word* + *cure wounds* is not; *misty step* (bonus) + *shield* later in the round is legal because *shield* is cast on a different turn (reactions off-turn are unaffected).

> **2024 note:** The 2024 revision replaces this with "only one spell that expends a **spell slot** per turn" — so bonus-action *misty step* + action *fire bolt* stays legal, and action *levitate* + bonus *healing word* becomes illegal while cantrip combinations open up. Implementations should treat the constraint as a pluggable rule.

- **1 reaction:** cast when the spell's stated trigger occurs (e.g. *shield*: "when you are hit by an attack"; *counterspell*: "when you see a creature within 60 feet casting a spell"). Consumes your reaction; usable on any turn.
- **Minutes/hours:** you spend your action each turn of the cast and must maintain concentration throughout; the slot is only consumed on completion; interruption wastes the effort but not the slot.

### Timing edge cases

| Situation | Ruling |
|---|---|
| Two reaction spells in one round | Impossible for one caster — one reaction per round (refreshes at the start of your turn) |
| Reaction spell on your own turn | Legal if the trigger occurs (e.g. *shield* against a readied attack released on your turn) |
| Bonus-action spell, then reaction spell later in the round | Legal — the bonus-action rule constrains only spells cast **during your turn** |
| Casting the same concentration spell twice | Second cast ends the first (it's still "another concentration spell") |
| Slot spent when a cast is counterspelled | Yes — the slot is expended even though the spell fails |

## Attack rolls, saving throws, and DCs

Two resolution modes, dictated by each spell's text (API fields `attack_type` vs `dc`):

```
Spell attack bonus = proficiency bonus + spellcasting ability modifier
Spell save DC      = 8 + proficiency bonus + spellcasting ability modifier
```

- **Spell attack:** d20 + spell attack bonus vs target AC; can crit (double the spell's damage dice); melee spell attacks in reach, ranged spell attacks suffer disadvantage with a hostile creature within 5 ft.
- **Saving throw:** target rolls d20 + save modifier vs your spell save DC. The spell states which ability and the effect on success.
- **Half-on-save convention:** many damage spells deal **half damage (round down) on a successful save** — but only when the spell says so (API `dc.dc_success = "half"`). Never assume it.
- Casting abilities: Int (wizard), Wis (cleric, druid, ranger), Cha (bard, paladin, sorcerer, warlock).

## Areas of effect

Every AoE has a **point of origin** placed within the spell's range. The area extends from it per shape; the effect is blocked by **total cover** relative to the point of origin. Unless the spell says otherwise, the point of origin is **not** included for a cone/line (it starts there) and **is** covered by a sphere/cube per the shape rules.

| Shape | Definition | Point of origin included? |
|---|---|---|
| **Cone** | Extends in a direction; **width at any point = distance from origin** (a 15-ft cone is 15 ft wide at its far end) | No |
| **Cube** | Side length given; origin lies on **any face** of the cube | Not unless you place it inside |
| **Cylinder** | Radius + height; origin is the **center of the top or bottom circle** | Yes (it's inside the circle) |
| **Line** | Length + width (usually 5 ft), straight from origin | No |
| **Sphere** | Radius from origin, spreads around corners for some spells | Yes |

**Grid note — the 15-ft cone:** on a 5-ft grid, a cone aimed along a row covers roughly a 1/2/3-square widening triangle (about 6 squares); aimed diagonally it covers a stepped triangle of similar area. Pick one convention and keep it.

**DM rule of thumb — expected number of targets** (for eyeballing whether a placement is reasonable; round up, minimum 1):

| Shape | Targets ≈ |
|---|---|
| Cone | size ÷ 10 |
| Cube or square | size ÷ 5 |
| Cylinder | radius ÷ 5 |
| Line | length ÷ 30 |
| Sphere or circle | radius ÷ 5 |

## Combining magical effects

- **The same spell cast multiple times doesn't stack.** While durations overlap, apply the **most potent** instance (e.g. highest bonus); when it ends, a weaker overlapping instance resumes if still running.
- Different spells stack normally (e.g. *bless* + *haste*): no rule against it.
- Same rule applies to other identical game effects unless the effect says otherwise.
- Sheet model: effects keyed by `spellIndex`; on apply, keep all instances but expose `max(potency)` for modifiers.

## Counterspell, dispel, and identifying casting

SRD-safe general conventions:

- ***Counterspell*** targets **a creature in the act of casting** — it's a reaction to the *casting*, resolved before the spell takes effect. Cast at slot level N, it **automatically stops** any spell of **level ≤ N**; against a higher-level spell, make a **spellcasting ability check, DC 10 + the spell's level** (success = interrupted). The interrupted spell fails with **no effect, and its caster's slot is still expended**.
- ***Dispel magic*** targets **an ongoing spell effect** (via a creature, object, or point in space carrying one): auto-ends spells of level ≤ the dispel's slot level; otherwise a **spellcasting ability check, DC 10 + the spell's level**, per spell on the target. It does nothing to instantaneous effects (damage already dealt) or to non-spell magic (magic items, curses, a lich's lair).
- **Identifying a spell being cast:** no rule exists in SRD 5.1. The widely used convention (from later official rulings): a **reaction or action** to make an **Intelligence (Arcana) check, DC 15 + spell level** identifies the spell as it's cast or from its visible effect. Decide before someone needs *counterspell* — the honest reading is that you counterspell on perceptible casting (V/S/M) *without* knowing what the spell is.
- **Perceptibility:** casting with V, S, or M components is **perceptible** to observers; a spell with no perceivable components and no visible effect is unnoticeable.

## Targeting

- **"A creature you can see"** means exactly that: line of sight required; blinded casters and invisible targets are excluded. "A creature within range" (no "see") has no sight requirement.
- **Clear path:** to target something, there must be **no total cover** between you and it. A target behind total cover is untargetable even if within range and visible (e.g. through a window of *wall of force*... a glass window is total cover with visibility).
- **AoE origin behind cover:** if you place a point of origin where you lack a clear path, the origin lands **on the near side** of the obstruction.
- **Self (range):** you're the target, or (with an area in parentheses) the origin of the area.
- **Invalid target:** if you target something that's an invalid target for the spell (e.g. *hold person* on a creature that turns out not to be a humanoid), the common convention (from official errata beyond the SRD): the spell fails and the **slot is wasted**, but no effect occurs. Decide and apply consistently.
- Spells create their effects only **on their turn of casting** unless the duration says otherwise; a spell's effect ends immediately when concentration breaks or duration expires — no lingering partial effects unless stated.

## Sorcerer casting notes — SRD Metamagic

Sorcerers have **sorcery points** (= sorcerer level, max 20; refresh on long rest) and can convert points ↔ slots (Flexible Casting). SRD 5.1 includes exactly these eight Metamagic options (choose 2 at level 3):

| Metamagic | Cost | Exact effect |
|---|---|---|
| **Careful Spell** | 1 SP | When forcing a save: choose up to Cha-mod creatures (min 1); they **automatically succeed** on the save |
| **Distant Spell** | 1 SP | Range ≥ 5 ft → **double the range**; range Touch → range becomes **30 ft** |
| **Empowered Spell** | 1 SP | Reroll up to **Cha-mod** damage dice (min 1); must use the new rolls; combinable with another Metamagic on the same spell |
| **Extended Spell** | 1 SP | Duration ≥ 1 minute → **double duration**, max 24 hours |
| **Heightened Spell** | 3 SP | One target of the spell has **disadvantage on its first save** against it |
| **Quickened Spell** | 2 SP | A 1-action casting time becomes **1 bonus action** (bonus-action spell rule then applies!) |
| **Subtle Spell** | 1 SP | Cast **without V and S** components (M unaffected) — defeats counterspell-by-perception |
| **Twinned Spell** | spell level SP (1 for cantrips) | A spell targeting **one creature** (not Self, not multi-target-capable at its level) targets a **second** creature in range |

Only one Metamagic per casting, except Empowered can pair with another.

## Spell lists — data pointers, not enumerations

Do not hardcode spell lists; query the proxy. SRD 5.1 counts (live from the API, 2026-08):

| Class | SRD spells | Query |
|---|---|---|
| Bard | 111 | `API: /api/2014/classes/bard/spells` |
| Cleric | 105 | `API: /api/2014/classes/cleric/spells` |
| Druid | 106 | `API: /api/2014/classes/druid/spells` |
| Paladin | 31 | `API: /api/2014/classes/paladin/spells` |
| Ranger | 37 | `API: /api/2014/classes/ranger/spells` |
| Sorcerer | 120 | `API: /api/2014/classes/sorcerer/spells` |
| Warlock | 64 | `API: /api/2014/classes/warlock/spells` |
| Wizard | 204 | `API: /api/2014/classes/wizard/spells` |
| **All** | **319** | `API: /api/2014/spells` — filterable: `?level=3`, `?school=evocation` |

### 20 spells every DM should know cold

All verified present in SRD 5.1 / the API. C = concentration, R = ritual, BA/Rx = bonus-action/reaction casting time.

| Spell | Lvl | School | Flags | Why it matters at the table |
|---|---|---|---|---|
| *guidance* | 0 | Divination | C | +1d4 to a check; constantly active out of combat |
| *bless* | 1 | Enchantment | C | +1d4 to attacks & saves, 3 targets; best low-level buff |
| *cure wounds* | 1 | Evocation | — | Touch heal 1d8+mod; no effect on undead/constructs |
| *healing word* | 1 | Evocation | BA | 60-ft bonus-action heal — the yo-yo-at-0-HP enabler |
| *mage armor* | 1 | Abjuration | — | AC 13+Dex for 8 h, no armor worn |
| *shield* | 1 | Abjuration | Rx | +5 AC until next turn, after seeing the hit |
| *hold person* | 2 | Enchantment | C | Paralyzes a humanoid; save repeats each turn; melee hits crit |
| *invisibility* | 2 | Illusion | C | Ends when target attacks or casts |
| *misty step* | 2 | Conjuration | BA | 30-ft teleport; no opportunity attacks; bonus-action spell rule applies |
| *spiritual weapon* | 2 | Evocation | BA | **No concentration** — stacks with a concentration spell |
| *suggestion* | 2 | Enchantment | C | Social control; up to 8 h; reasonable-sounding course only |
| *web* | 2 | Conjuration | C | Area control; restrains; flammable |
| *counterspell* | 3 | Abjuration | Rx | Auto-negate ≤3rd; check DC 10+level above |
| *dispel magic* | 3 | Abjuration | — | Ends ongoing spells; same threshold math |
| *fireball* | 3 | Evocation | — | 8d6 Dex-half in a 20-ft radius; spreads around corners |
| *fly* | 3 | Transmutation | C | 60-ft fly speed; falling on concentration break |
| *haste* | 3 | Transmutation | C | +2 AC, doubled speed, 1 extra limited action; **lethargy turn when it ends** |
| *revivify* | 3 | Necromancy | — | Dead ≤1 min → 1 HP; consumes 300 gp diamonds — never substituted by focus |
| *banishment* | 4 | Abjuration | C | Cha save or gone; permanent if native to another plane and held full duration |
| *polymorph* | 4 | Transmutation | C | Wis save; beast form with its HP as a buffer; drops to 0 → reverts with excess damage carrying over |

(*wall of force* — 5th, Evocation, C — is the honorable 21st: untargetable through it, immune to *dispel magic*, vulnerable to *disintegrate*.)

## Casting a spell — resolution sequence

The deterministic order a sheet or DM tool should walk for any cast:

1. **Legality gates** (any failure aborts before resources are spent):
   - Spell is known/prepared (or on the wizard's book for a ritual).
   - Casting-time resource is available this turn (action / bonus action / reaction with valid trigger).
   - Bonus-action spell rule not violated (2014: a bonus-action spell this turn locks other spells to 1-action cantrips).
   - Components satisfiable: can speak (V), free hand (S), materials/focus/pouch present and costed items owned (M).
   - Armor worn is proficient (or none).
   - A slot of the required level is available (skip for cantrips and rituals).
   - Target legality: within range, clear path (no total cover), visible if the spell requires sight.
2. **Commit resources:** expend the slot (choose level ≥ spell level); consume consumed materials.
3. **Concentration handshake:** if the new spell needs concentration, end any current concentration effect now.
4. **Resolve:** attack roll(s) vs AC, or save(s) vs `8 + PB + mod`; apply damage/effects; roll AoE damage once for all targets.
5. **Register ongoing state:** duration timer, concentration link, "At Higher Levels" scaling recorded at the **cast slot level**.

## Rests and recovery

| Resource | Short rest (≥1 h) | Long rest (≥8 h, max 1/day) |
|---|---|---|
| Standard spell slots | — | All restored |
| Pact Magic slots | All restored | All restored |
| Sorcery points | — | All restored |
| Wizard **Arcane Recovery** | Once/day after a short rest: recover slots with combined levels ≤ ⌈wizard level ÷ 2⌉, none 6th+ | (resets availability) |
| Prepared-list changes | — | Allowed (prepared casters only) |
| Hit points / Hit Dice | Spend Hit Dice | All HP; regain up to half total Hit Dice |

A long rest is broken by 1+ hour of walking, fighting, casting spells, or similar adventuring; up to 1 hour of light activity (reading, keeping watch) is fine.

## DND-009 sheet model checklist (spell panel)

Minimum state the combat-core character sheet needs to track per character:

```
spellcasting: {
  ability: "int" | "wis" | "cha",       // derive saveDC = 8 + PB + mod; attackBonus = PB + mod
  model: "prepared" | "known",
  cantripsKnown: string[],               // spell indexes, scale dice off characterLevel
  spellsPreparedOrKnown: string[],
  slots: {
    standard: { [level: 1..9]: { max: number, used: number } },
    pact?: { count: number, level: 1..5, used: number }   // warlock only
  },
  sorceryPoints?: { max: number, used: number },
  concentratingOn: { spellIndex: string, castAtLevel: number, expiresAt?: turnRef } | null,
  ritualCaster: boolean
}
```

Derived checks to enforce in UI: slot buttons disabled at `used == max`; casting a concentration spell prompts to drop the current one; damage entry on a concentrating character auto-prompts the Con save with the computed DC; bonus-action spell rule surfaced as a per-turn flag.

## Common table rulings

- **Q: Can I cast *misty step* and *fire bolt* on the same turn?** → A: Yes (2014 rules): the bonus-action spell restricts the other spell to a **cantrip with a 1-action casting time**, which *fire bolt* is. *Misty step* + *cure wounds* is illegal.
- **Q: Can I counterspell a counterspell?** → A: Yes. *Counterspell* is itself a spell being cast within 60 ft, and another creature with its reaction available can react to that casting.
- **Q: Do two *bless* spells on the same target give +2d4?** → A: No. The same spell doesn't stack with itself — one instance (the most potent) applies while they overlap.
- **Q: I'm holding a sword and shield — can I cast spells?** → A: Not ones with somatic components, unless a hand is free (sheathe or drop something with your free object interaction). A cleric using the shield with a holy symbol emblazoned on it as a focus can cover M and (by common ruling, not SRD text) the S of spells that also have M — strict SRD requires a free hand for S-only spells.
- **Q: Does losing concentration on *fly* mid-air kill me?** → A: You fall immediately (1d6 per 10 ft, max 20d6). No SRD slow-descent grace; some tables house-rule a gentle landing.
- **Q: Can a warlock use a 5th-level Pact slot on *hex* for the long duration?** → A: Yes — Pact slots are always cast at their single level, so a 9th+ level warlock's *hex* is automatically upcast (5th level = 24 hours).
- **Q: Can I ready *fireball* to blast the first enemy through the door?** → A: Yes, but you cast it **now** — the slot is spent immediately, you must **concentrate** to hold it (dropping any other concentration spell), and if the trigger never happens or concentration breaks, the slot is wasted.
- **Q: Does *dispel magic* remove a *fireball*'s damage or a curse?** → A: Neither. It only ends **ongoing spell effects with a duration**. Instantaneous effects are over, and curses/magic items need *remove curse*-type answers.
