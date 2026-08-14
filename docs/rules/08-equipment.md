# 08 — Equipment

> Purpose: Exact SRD 5.1 rules for currency, armor, weapons, gear, prices, and magic item fundamentals, precise enough to drive the character creation form (DND-008) and combat sheet (DND-009).

## Currency

The standard coin is the **gold piece (gp)**. All coins weigh the same: **50 coins = 1 lb**. (`API: /api/2014/equipment-categories`)

| Coin | cp | sp | ep | gp | pp |
|---|---:|---:|---:|---:|---:|
| **Copper (cp)** | 1 | 1/10 | 1/50 | 1/100 | 1/1,000 |
| **Silver (sp)** | 10 | 1 | 1/5 | 1/10 | 1/100 |
| **Electrum (ep)** | 50 | 5 | 1 | 1/2 | 1/20 |
| **Gold (gp)** | 100 | 10 | 2 | 1 | 1/10 |
| **Platinum (pp)** | 1,000 | 100 | 20 | 10 | 1 |

- Rule of thumb: 1 gp = 10 sp = 100 cp; 1 pp = 10 gp. Electrum is rare in play; many tables ignore it.
- Selling used gear: undamaged weapons/armor/gear typically sell for **half** list price. Trade goods and gems sell at full value.

## Armor

(`API: /api/2014/equipment`, category `armor` via `/api/2014/equipment-categories/armor`)

### AC computation by category

- **Unarmored**: AC = **10 + Dex modifier** (class features like Unarmored Defense replace this; use whichever single formula is best — they never stack with armor).
- **Light armor**: AC = base + **full Dex modifier**.
- **Medium armor**: AC = base + **Dex modifier, max +2**.
- **Heavy armor**: AC = base, **no Dex modifier** (positive or negative).
- **Shield**: **+2 AC** while wielded, stacks with any armor or unarmored formula. Only one shield's bonus applies.
- A character wearing armor with a **Strength requirement** they do not meet has speed reduced by **10 ft**. (The armor still works otherwise.)
- **Without proficiency** in the armor worn (shield included): **disadvantage on every ability check, saving throw, and attack roll that involves Strength or Dexterity**, and the wearer **cannot cast spells**.
- **Stealth disadvantage** column: disadvantage on Dexterity (Stealth) checks while worn.

### Armor table

| Armor | Category | Cost | AC | Strength | Stealth | Weight |
|---|---|---:|---|---|---|---:|
| Padded | Light | 5 gp | 11 + Dex | — | Disadvantage | 8 lb |
| Leather | Light | 10 gp | 11 + Dex | — | — | 10 lb |
| Studded leather | Light | 45 gp | 12 + Dex | — | — | 13 lb |
| Hide | Medium | 10 gp | 12 + Dex (max 2) | — | — | 12 lb |
| Chain shirt | Medium | 50 gp | 13 + Dex (max 2) | — | — | 20 lb |
| Scale mail | Medium | 50 gp | 14 + Dex (max 2) | — | Disadvantage | 45 lb |
| Breastplate | Medium | 400 gp | 14 + Dex (max 2) | — | — | 20 lb |
| Half plate | Medium | 750 gp | 15 + Dex (max 2) | — | Disadvantage | 40 lb |
| Ring mail | Heavy | 30 gp | 14 | — | Disadvantage | 40 lb |
| Chain mail | Heavy | 75 gp | 16 | Str 13 | Disadvantage | 55 lb |
| Splint | Heavy | 200 gp | 17 | Str 15 | Disadvantage | 60 lb |
| Plate | Heavy | 1,500 gp | 18 | Str 15 | Disadvantage | 65 lb |
| Shield | Shield | 10 gp | +2 | — | — | 6 lb |

### Donning and doffing

| Category | Don | Doff |
|---|---|---|
| Light armor | 1 minute | 1 minute |
| Medium armor | 5 minutes | 1 minute |
| Heavy armor | 10 minutes | 5 minutes |
| Shield | 1 action | 1 action |

- Sleeping in medium or heavy armor is not penalized in SRD 5.1 (common house rule: it is).

> **2024 note:** the revision adds an "Unarmored Defense doesn't stack" clarification and lets you doff a shield as part of the Attack action's free interaction; the armor tables themselves are unchanged.

## Weapons

(`API: /api/2014/equipment`, categories `simple-weapons` / `martial-weapons` via `/api/2014/equipment-categories`)

- **Proficiency**: proficient → add proficiency bonus to attack rolls with that weapon. Not proficient → no proficiency bonus (no other penalty).
- **Attack/damage ability**: melee weapons use **Strength**; ranged weapons use **Dexterity**; **finesse** lets you pick either; **thrown** melee weapons use the same ability as their melee attack (so Str, unless also finesse).
- **Improvised weapons**: 1d4 damage, range 20/60 if thrown; if it resembles a real weapon, the DM may treat it as that weapon.

### Simple melee weapons

| Weapon | Cost | Damage | Weight | Properties |
|---|---:|---|---:|---|
| Club | 1 sp | 1d4 bludgeoning | 2 lb | Light |
| Dagger | 2 gp | 1d4 piercing | 1 lb | Finesse, light, thrown (20/60) |
| Greatclub | 2 sp | 1d8 bludgeoning | 10 lb | Two-handed |
| Handaxe | 5 gp | 1d6 slashing | 2 lb | Light, thrown (20/60) |
| Javelin | 5 sp | 1d6 piercing | 2 lb | Thrown (30/120) |
| Light hammer | 2 gp | 1d4 bludgeoning | 2 lb | Light, thrown (20/60) |
| Mace | 5 gp | 1d6 bludgeoning | 4 lb | — |
| Quarterstaff | 2 sp | 1d6 bludgeoning | 4 lb | Versatile (1d8) |
| Sickle | 1 gp | 1d4 slashing | 2 lb | Light |
| Spear | 1 gp | 1d6 piercing | 3 lb | Thrown (20/60), versatile (1d8) |

### Simple ranged weapons

| Weapon | Cost | Damage | Weight | Properties |
|---|---:|---|---:|---|
| Crossbow, light | 25 gp | 1d8 piercing | 5 lb | Ammunition (80/320), loading, two-handed |
| Dart | 5 cp | 1d4 piercing | 1/4 lb | Finesse, thrown (20/60) |
| Shortbow | 25 gp | 1d6 piercing | 2 lb | Ammunition (80/320), two-handed |
| Sling | 1 sp | 1d4 bludgeoning | — | Ammunition (30/120) |

### Martial melee weapons

| Weapon | Cost | Damage | Weight | Properties |
|---|---:|---|---:|---|
| Battleaxe | 10 gp | 1d8 slashing | 4 lb | Versatile (1d10) |
| Flail | 10 gp | 1d8 bludgeoning | 2 lb | — |
| Glaive | 20 gp | 1d10 slashing | 6 lb | Heavy, reach, two-handed |
| Greataxe | 30 gp | 1d12 slashing | 7 lb | Heavy, two-handed |
| Greatsword | 50 gp | 2d6 slashing | 6 lb | Heavy, two-handed |
| Halberd | 20 gp | 1d10 slashing | 6 lb | Heavy, reach, two-handed |
| Lance | 10 gp | 1d12 piercing | 6 lb | Reach, special |
| Longsword | 15 gp | 1d8 slashing | 3 lb | Versatile (1d10) |
| Maul | 10 gp | 2d6 bludgeoning | 10 lb | Heavy, two-handed |
| Morningstar | 15 gp | 1d8 piercing | 4 lb | — |
| Pike | 5 gp | 1d10 piercing | 18 lb | Heavy, reach, two-handed |
| Rapier | 25 gp | 1d8 piercing | 2 lb | Finesse |
| Scimitar | 25 gp | 1d6 slashing | 3 lb | Finesse, light |
| Shortsword | 10 gp | 1d6 piercing | 2 lb | Finesse, light |
| Trident | 5 gp | 1d6 piercing | 4 lb | Thrown (20/60), versatile (1d8) |
| War pick | 5 gp | 1d8 piercing | 2 lb | — |
| Warhammer | 15 gp | 1d8 bludgeoning | 2 lb | Versatile (1d10) |
| Whip | 2 gp | 1d4 slashing | 3 lb | Finesse, reach |

### Martial ranged weapons

| Weapon | Cost | Damage | Weight | Properties |
|---|---:|---|---:|---|
| Blowgun | 10 gp | 1 piercing | 1 lb | Ammunition (25/100), loading |
| Crossbow, hand | 75 gp | 1d6 piercing | 3 lb | Ammunition (30/120), light, loading |
| Crossbow, heavy | 50 gp | 1d10 piercing | 18 lb | Ammunition (100/400), heavy, loading, two-handed |
| Longbow | 50 gp | 1d8 piercing | 2 lb | Ammunition (150/600), heavy, two-handed |
| Net | 1 gp | — | 3 lb | Special, thrown (5/15) |

### Weapon properties (exact definitions)

- **Ammunition (x/y)**: you can attack only if you have ammunition; each attack expends one piece. Drawing ammunition is part of the attack. Recovering ammo: after battle, 1 minute of searching recovers **half** the expended ammunition. Using an ammunition weapon in melee = improvised weapon (1d4).
- **Finesse**: choose **Str or Dex** for both attack and damage rolls; you must use the **same** ability for both.
- **Heavy**: **Small** creatures have **disadvantage** on attack rolls with heavy weapons.
- **Light**: enables **two-weapon fighting**: when you take the Attack action attacking with a light melee weapon in one hand, you may use a **bonus action** to attack with a different light melee weapon in the other hand; you **do not add your ability modifier** to the bonus attack's damage unless it is negative.
- **Loading**: you can fire only **one piece of ammunition per action, bonus action, or reaction**, regardless of how many attacks you could normally make (Extra Attack does not stack shots).
- **Range (x/y)**: x = **normal range** (no penalty), y = **long range** (attack at **disadvantage**). Beyond long range you cannot attack. Ranged attacks within **5 ft** of a hostile creature that can see you and isn't incapacitated are at **disadvantage**.
- **Reach**: adds **5 ft** to your reach for attacks **and** for opportunity attacks with that weapon.
- **Special** — *Lance*: disadvantage when attacking a target within 5 ft; requires two hands to wield when you are **not mounted**. *Net*: on a hit, a Large or smaller creature is **restrained** until freed (no damage); a creature (or one within reach of it) can use its **action** to make a **DC 10 Strength check** to free the target, or deal **5 slashing** to the net (AC 10) to destroy it. No effect on formless creatures or Huge+. When you attack with a net you can make **only one attack** that turn, regardless of Extra Attack.
- **Thrown (x/y)**: you may throw the weapon to make a ranged attack using the **same ability** as its melee attack (finesse thrown weapons like the dagger may use Dex).
- **Two-handed**: requires two hands **when you attack with it** (you can hold it one-handed between attacks).
- **Versatile (dX)**: deals the listed larger die when wielded with **two hands**.

> **2024 note:** the revision adds a Weapon Mastery property to every weapon (Nick, Topple, Graze, etc.) and lets the two-weapon-fighting bonus attack come from the Light property directly. SRD 5.1 / dnd5eapi data has none of that.

### Ammunition

| Ammunition | Cost | Weight | Fits |
|---|---:|---:|---|
| Arrows (20) | 1 gp | 1 lb | Shortbow, longbow |
| Blowgun needles (50) | 1 gp | 1 lb | Blowgun |
| Crossbow bolts (20) | 1 gp | 1.5 lb | All crossbows |
| Sling bullets (20) | 4 cp | 1.5 lb | Sling (common ruling: improvised stones work but deal 1d4 as an improvised weapon at the DM's discretion) |

Quiver holds 20 arrows; case holds 20 bolts. After combat, 1 minute of searching recovers half of expended ammunition (see Ammunition property).

## Carrying capacity and encumbrance

- **Carrying capacity** = **Strength score × 15 lb**. Push/drag/lift = **Strength score × 30 lb** (while pushing/dragging over capacity, speed drops to 5 ft).
- Size scaling: **Large ×2, Huge ×4, Gargantuan ×8; Tiny ×1/2** (applies to capacity and push/drag/lift).
- **Variant encumbrance** (optional rule the form may expose as a toggle):
  - Carried weight > **Str × 5** → **encumbered**: speed −10 ft.
  - Carried weight > **Str × 10** → **heavily encumbered**: speed −20 ft, and **disadvantage** on ability checks, attack rolls, and saving throws that use Str, Dex, or Con.

## Containers and packs

| Container | Cost | Capacity |
|---|---:|---|
| Backpack | 2 gp | 1 cubic ft / 30 lb |
| Pouch | 5 sp | 1/5 cubic ft / 6 lb |
| Sack | 1 cp | 1 cubic ft / 30 lb |
| Chest | 5 gp | 12 cubic ft / 300 lb |
| Barrel | 2 gp | 40 gallons liquid / 4 cubic ft solid |
| Flask / tankard | 2 cp | 1 pint |
| Waterskin | 2 sp | 4 pints |
| Vial | 1 gp | 4 ounces |

**Equipment packs** (cheaper than buying piecemeal; the creation form should offer pack-or-gold):

| Pack | Cost | Notable contents |
|---|---:|---|
| Burglar's | 16 gp | Backpack, 1,000 ball bearings, string, bell, 5 candles, crowbar, hammer, 10 pitons, hooded lantern, 2 oil flasks, 5 days rations, tinderbox, waterskin, 50 ft hempen rope |
| Diplomat's | 39 gp | Chest, 2 map cases, fine clothes, ink/pen, lamp, 2 oil flasks, 5 paper, perfume, sealing wax, soap |
| Dungeoneer's | 12 gp | Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50 ft hempen rope |
| Entertainer's | 40 gp | Backpack, bedroll, 2 costumes, 5 candles, 5 days rations, waterskin, disguise kit |
| Explorer's | 10 gp | Backpack, bedroll, mess kit, tinderbox, 10 torches, 10 days rations, waterskin, 50 ft hempen rope |
| Priest's | 19 gp | Backpack, blanket, 10 candles, tinderbox, alms box, 2 incense blocks, censer, vestments, 2 days rations, waterskin |
| Scholar's | 40 gp | Backpack, book of lore, ink/pen, 10 parchment, bag of sand, small knife |

## Adventuring gear highlights

(`API: /api/2014/equipment`, category `adventuring-gear`)

| Item | Cost | Weight | Rules that matter |
|---|---:|---:|---|
| Rope, hempen (50 ft) | 1 gp | 10 lb | 2 HP, burst DC 17 Strength check |
| Rope, silk (50 ft) | 10 gp | 5 lb | Same HP/DC, half weight |
| Torch | 1 cp | 1 lb | Bright 20 ft / dim +20 ft, burns 1 hour; melee hit deals 1 fire |
| Candle | 1 cp | — | Bright 5 ft / dim +5 ft, 1 hour |
| Lamp | 5 sp | 1 lb | Bright 15 ft / dim +30 ft, 6 h per flask of oil |
| Lantern, hooded | 5 gp | 2 lb | Bright 30 ft / dim +30 ft, 6 h per flask; hood down = dim 5 ft only |
| Lantern, bullseye | 10 gp | 2 lb | 60-ft cone bright / +60 ft cone dim, 6 h per flask |
| Oil (flask) | 1 sp | 1 lb | Thrown: on hit target takes +5 fire if it takes any fire damage before oil dries; poured: 5-ft square, 5 fire if ignited |
| Healer's kit | 5 gp | 3 lb | 10 uses; 1 use + action **stabilizes** a dying creature at 0 HP, no check |
| Potion of healing | 50 gp | 1/2 lb | Drink (action): regain **2d4 + 2 HP** |
| Holy water (flask) | 25 gp | 1 lb | Thrown (improvised, range 20 ft): **2d6 radiant** to a fiend or undead on hit |
| Caltrops (bag of 20) | 1 gp | 2 lb | Cover a 5-ft square; entering creature: **DC 15 Dex save** or stop moving, take 1 piercing, **−10 ft speed** until it regains ≥1 HP; walking at half speed avoids the save |
| Ball bearings (bag of 1,000) | 1 gp | 2 lb | Cover a 10-ft square; entering creature: **DC 10 Dex save** or fall **prone**; half speed avoids the save |
| Crowbar | 2 gp | 5 lb | Advantage on Strength checks where leverage applies |
| Rations (1 day) | 5 sp | 2 lb | One person-day of food |
| Waterskin | 2 sp | 5 lb (full) | Holds 4 pints (1/2 gallon) |
| Component pouch / spell focus | 25 gp / 5–20 gp | 2 lb / var | Replaces non-cost material components |
| Antitoxin (vial) | 50 gp | — | Advantage on saves vs poison for 1 hour |
| Acid (vial) | 25 gp | 1 lb | Thrown (improvised): 2d6 acid on hit |
| Alchemist's fire (flask) | 50 gp | 1 lb | Thrown: 1d4 fire at start of each of target's turns; action + DC 10 Dex check to extinguish |

**Tools** (proficiency lets you add proficiency bonus to related ability checks): artisan's tools 1–50 gp (smith's 20 gp, alchemist's 50 gp, brewer's 20 gp…), **thieves' tools 25 gp** (picking locks, disarming traps), herbalism kit 5 gp (create antitoxin/potions of healing), disguise kit 25 gp, forgery kit 15 gp, navigator's tools 25 gp, poisoner's kit 50 gp, gaming sets 1 sp–1 gp, musical instruments 2–30 gp. (`API: /api/2014/equipment-categories/tools`)

## Lifestyle expenses and typical prices

| Lifestyle | Cost per day |
|---|---:|
| Wretched | — |
| Squalid | 1 sp |
| Poor | 2 sp |
| Modest | 1 gp |
| Comfortable | 2 gp |
| Wealthy | 4 gp |
| Aristocratic | 10 gp minimum |

| Service / item | Price |
|---|---:|
| Inn (per day): squalid / modest / wealthy | 7 cp / 5 sp / 2 gp |
| Meal: poor / modest / wealthy | 6 cp / 3 sp / 8 sp |
| Ale (mug) / wine (common pitcher) | 4 cp / 2 sp |
| Hireling: untrained / skilled | 2 sp/day / 2 gp/day |
| Messenger | 2 cp per mile |
| Road/gate toll | 1 cp |
| Ship's passage | 1 sp per mile |

## Trade goods

Trade goods hold full value and are how commoners often trade. Representative SRD prices:

| Cost | Goods |
|---:|---|
| 1 cp | 1 lb wheat |
| 2 cp | 1 lb flour, or one chicken |
| 5 cp | 1 lb salt |
| 1 sp | 1 lb iron, or 1 sq yd canvas |
| 5 sp | 1 lb copper, or 1 sq yd cotton cloth |
| 1 gp | 1 lb ginger, or one goat |
| 2 gp | 1 lb cinnamon or pepper, or one sheep |
| 3 gp | 1 lb cloves, or one pig |
| 5 gp | 1 lb silver, or 1 sq yd linen |
| 10 gp | 1 sq yd silk, or one cow |
| 15 gp | 1 lb saffron, or one ox |
| 50 gp | 1 lb gold |
| 500 gp | 1 lb platinum |

## Magic items fundamentals

(`API: /api/2014/magic-items` — each resource carries `rarity` and a boolean-ish attunement marker in its description; `/api/2014/magic-item` categories nest via `variants`.)

### Rarity, value, and level guidance

| Rarity | Rough value | Character level guidance |
|---|---:|---|
| Common | 50–100 gp | 1st+ |
| Uncommon | 101–500 gp | 1st+ |
| Rare | 501–5,000 gp | 5th+ |
| Very rare | 5,001–50,000 gp | 11th+ |
| Legendary | 50,001+ gp | 17th+ |
| Artifact | priceless / plot | DM only |

- Consumables (potions, scrolls) are conventionally worth **half** the listed range for their rarity.
- Magic items are not assumed to be purchasable; treat prices as guidance for treasure and bespoke sales.

### Attunement

- Some items require **attunement**: spend a **short rest** (≥1 hour) focused on only that item, in physical contact with it. An item needing a class/alignment prerequisite can't be attuned without it.
- Hard cap: a creature can be attuned to **at most 3 items** at once, and never to more than one **copy** of the same item.
- Attunement **ends** if: the item has been **more than 100 ft away for 24+ hours**, the creature **dies**, another creature attunes to the item, or the creature **voluntarily ends it** with a short rest spent doing so (unless the item is cursed).
- Without required attunement, the item confers **only its non-magical benefits** (a *+1 sword* needing attunement swings as a plain sword).

### Identifying items

- **Short rest focus**: handling/experimenting with an item over a short rest reveals its properties (not exact charges by RAW convention; cursed items conceal the curse).
- The **identify** spell (1st level, ritual) reveals properties, how to use them, whether it requires attunement, and remaining charges.
- **Potions**: a small taste is enough to identify one (common table convention endorsed by the DMG).

### Cursed items

- Convention: a curse is **not revealed** by identify or short-rest examination unless the DM says otherwise; attuning to a cursed item usually locks the attunement — it **cannot be voluntarily ended** until the curse is broken (*remove curse* or similar).

### Potions and scrolls

- **Potion**: drinking or administering to another creature is an **action**. Effects apply immediately; potion of healing dice are **not** doubled/modified by anything unless a feature says so.
- **Spell scroll**: usable only if the spell is **on your class's spell list**. If it is, and the spell's level ≤ the highest level you can cast, cast it from the scroll without components (uses the scroll's save DC/attack bonus). If the spell's level is **higher** than you can cast: make an **ability check using your spellcasting ability, DC 10 + the spell's level**; on failure the spell fails and the scroll is destroyed. The scroll crumbles after any use.
- Scroll baseline statistics (used when the scroll's DC/bonus matter, per the SRD spell scroll table):

| Spell level on scroll | Scroll rarity | Save DC | Attack bonus |
|---|---|---:|---:|
| Cantrip | Common | 13 | +5 |
| 1st | Common | 13 | +5 |
| 2nd | Uncommon | 13 | +5 |
| 3rd | Uncommon | 15 | +7 |
| 4th | Rare | 15 | +7 |
| 5th | Rare | 17 | +9 |
| 6th | Very rare | 17 | +9 |
| 7th | Very rare | 18 | +10 |
| 8th | Very rare | 18 | +10 |
| 9th | Legendary | 19 | +11 |

### Charged items convention

- Wands/staffs typically carry a **charge pool** (e.g. 7 charges), regain **1d6 + 1 charges daily at dawn**, and on spending the **last charge** roll a d20 — on a **1** the item is destroyed or depowered (item text governs; this is the recurring SRD pattern, not a universal rule).
- Charges and attunement state are per-item runtime state the combat sheet (DND-009) must persist, not derivable from the catalog data.

> **2024 note:** the revision makes drinking a potion yourself a **bonus action** and lets anyone use a spell scroll of a spell on their list they have "prepared-level" access to; SRD 5.1 keeps potions as an action.

## Common table rulings

- **Q: Can I add my Dex to damage with a longbow?** A: Yes — ranged weapons use Dex for both attack and damage; finesse is only needed to use Dex with a *melee* weapon.
- **Q: Does a shield stack with Mage Armor or Unarmored Defense?** A: Yes. A shield is a bonus, not an AC formula; it stacks with any single base AC calculation.
- **Q: Can my fighter fire a heavy crossbow twice with Extra Attack?** A: No — the loading property caps it at one shot per action unless a feature (e.g. Crossbow Expert-style feats, non-SRD) removes loading.
- **Q: I have 14 Dex in half plate — what's my AC?** A: 15 + 2 = 17. Medium armor caps the Dex bonus at +2, so Dex 16+ adds nothing more.
- **Q: Can I wield a versatile weapon and a shield?** A: Yes, using the one-handed damage die. The two-handed die requires both hands, which the shield occupies.
- **Q: Can I attune to two Rings of Protection?** A: No — you can never be attuned to more than one copy of the same item, and never to more than 3 items total.
- **Q: Does drinking a potion of healing in combat cost my whole action?** A: In SRD 5.1, yes (action to drink or administer). Many tables house-rule bonus action to drink your own — that is the 2024 rule, not 2014.
- **Q: A wizard finds a scroll of Cure Wounds — can they use it?** A: No. Cure Wounds is not on the wizard spell list, so the scroll is unintelligible to them; give it to the cleric, bard, druid, paladin, or ranger.
