# 05 — Combat

> Purpose: The complete SRD 5.1 combat loop as exact, testable rules — ordered sequences, state machines, and numeric tables — for AI assistants building the combat-core character sheet (DND-009), DMs running sessions, and players.

Baseline: SRD 5.1 (2014 rules), matching the data served by the app's proxy (`/api/dnd5e/*` → dnd5eapi.co). Rule text for conditions, damage types and equipment referenced here is available as structured data (`API: /api/2014/conditions`, `/api/2014/damage-types`, `/api/2014/equipment`).

## The combat sequence

Combat proceeds in this exact order:

1. **Determine surprise.** The DM decides who, if anyone, is surprised.
2. **Establish positions.** The DM decides where everyone is.
3. **Roll initiative.** Everyone rolls; the order is fixed for the whole combat.
4. **Take turns.** Each participant acts in initiative order during a **round**.
5. **Repeat step 4** until one side stops fighting (dead, fled, surrendered).

### Surprise

- If neither side is trying to be stealthy, nobody is surprised.
- If a creature or side is sneaking, the DM compares the **Dexterity (Stealth)** checks of the hiders against the **passive Wisdom (Perception)** of each opposing creature. Any creature that doesn't notice a threat is **surprised**.
- A surprised creature: **cannot move or take an action on its first turn** of the combat, and **cannot take a reaction until that first turn ends**.
- Surprise is per-creature, not per-side: some members of a group can be surprised while others are not.
- Surprise only exists at the start of combat. There is no "surprise round" as a separate round — surprised creatures still roll initiative and occupy a slot in round 1.

> **2024 note:** In the 2024 rules a surprised creature instead has **disadvantage on its initiative roll** and acts normally. Sheet implementations targeting SRD 5.1 should model surprise as a first-turn lockout flag.

### Initiative

- Everyone rolls a **Dexterity check** (d20 + Dex modifier; add other bonuses only if a feature grants them). No proficiency bonus applies by default.
- The DM may roll one initiative for an entire group of identical monsters.
- Order is descending. The order does not change between rounds.
- **Ties:** the SRD's rule — the DM decides ties among monsters, players decide ties among themselves, and the DM decides player-vs-monster ties. Common house resolutions (all fine to implement as options):
  - Higher Dexterity **score** wins.
  - Tied creatures each roll a d20; higher goes first.
  - Players always win PC-vs-monster ties.
- A sheet should store initiative as `(rolled total, Dex score)` to support the common tiebreak.

### Rounds and turns

| Unit | Duration | Contains |
|---|---|---|
| **Round** | 6 seconds of in-world time | One **turn** for every participant, in initiative order |
| **Turn** | A creature's slice of the round | Movement + action + (maybe) bonus action + (maybe) free interactions |
| **Minute** | 10 rounds | — |

Effects that last "until the end of your next turn" span into the following round. Effects that trigger "at the start of your turn" resolve before you move or act.

## Your turn

On your turn you can:

- **Move** up to your speed (splittable — see Movement).
- Take **one action**.
- Take **one bonus action** — only if a specific feature, spell, or item grants one. There is no default bonus action.
- Interact with **one object or feature of the environment for free** (draw a weapon, open a door, pull a lever). A **second** object interaction costs your action (the Use an Object action).
- Communicate briefly (free).
- Take a reaction on other creatures' turns (see Reactions) — but note you can also take a reaction on your own turn (e.g. an opportunity attack against someone else's readied movement, or *shield* against a readied attack).

You can forgo any or all of these. You can do nothing at all.

### The action list

All SRD actions, with exact rules:

| Action | Effect |
|---|---|
| **Attack** | Make one melee or ranged attack. Features like **Extra Attack** let you make more than one attack *as part of this one action*. Grapple and shove replace individual attacks (see Special melee attacks). |
| **Cast a Spell** | Cast a spell with a casting time of 1 action. (Bonus-action and reaction spells use those slots instead — see `06-spellcasting.md`.) |
| **Dash** | Gain extra movement equal to your speed (after modifiers) for the current turn. Effectively: `movement budget = 2 × speed` this turn. |
| **Disengage** | Your movement doesn't provoke **opportunity attacks** for the rest of the turn. |
| **Dodge** | Until the start of your next turn: attack rolls against you have **disadvantage** *if you can see the attacker*, and you make Dexterity saving throws with **advantage**. You lose the benefit if you become incapacitated or your speed drops to 0. |
| **Help** | Either (a) a creature you help gains **advantage on its next ability check** to do the task you help with, made before the start of your next turn; or (b) you feint/distract a target within **5 feet of you**, granting an ally **advantage on the first attack roll** against it before the start of your next turn. |
| **Hide** | Make a **Dexterity (Stealth)** check; DM applies the hiding rules. While hidden you are an unseen attacker (see Unseen attackers). You can't hide from a creature that can see you clearly. |
| **Ready** | Choose a perceivable **trigger** and a **response** (an action, or movement up to your speed). When the trigger fires, take the response **as a reaction** (or ignore it). Readying a spell: you **cast it now**, using its normal casting time components and slot, and **hold its energy — this requires concentration**. If concentration breaks before release, the spell is lost (slot spent). Only spells with a casting time of 1 action can be readied. A readied action not released is simply lost at the start of your next turn. |
| **Search** | Devote your action to finding something; DM calls for **Wisdom (Perception)** or **Intelligence (Investigation)**. |
| **Use an Object** | Interact with a second object this turn, or use an object that requires an action (e.g. drink a potion you feed to someone else, use a healer's kit). |

**Improvised actions** are allowed: anything not on the list is adjudicated by the DM, usually with an ability check.

### Bonus actions

- You get **at most one** bonus action per turn, and only when something explicitly grants one (e.g. two-weapon fighting's extra attack, *healing word*, a rogue's Cunning Action).
- You choose when to take it during your turn, unless the granting feature specifies timing.
- Anything that deprives you of actions (e.g. **incapacitated**) also deprives you of bonus actions.
- Sheet model: `bonusActionAvailable: boolean`, reset to `true` at the start of the creature's turn; spending requires a granting source.

### Reactions

- **One reaction per round.** It refreshes **at the start of your turn** (not at the start of the round).
- A reaction is an instant response to a trigger, taken on anyone's turn — including your own.
- If a reaction interrupts another creature's turn (e.g. an opportunity attack), that creature resumes its turn after the reaction resolves.
- Being **incapacitated** prevents reactions. A surprised creature can't react until its first turn ends.
- Sheet model: `reactionAvailable: boolean`, set `true` at start of that creature's turn, set `false` on use.

#### Opportunity attacks

**Provokes** an opportunity attack:
- A hostile creature **you can see** moves **out of your reach** using its movement, its action (e.g. Dash-driven movement), or its reaction.

**Does NOT provoke:**
- Teleportation (e.g. *misty step*).
- Being moved without using movement/action/reaction (shoved by a spell, pulled, thrown, carried, falling).
- Moving **within** your reach (circling you at 5 ft never provokes; only *leaving* reach does).
- A creature that took the **Disengage** action this turn.

The opportunity attack is **one melee attack** against the provoking creature, taken as a **reaction**, occurring **just before the creature leaves your reach**.

## Movement

- Your movement budget per turn is your **speed** (`API: /api/2014/races` gives base speeds).
- **Splitting movement:** you can break up movement freely around and between actions and attacks — move, attack, move again — as long as the total doesn't exceed your speed. With Extra Attack you may move between attacks.
- **Multiple speeds** (walk/fly/swim/climb): moving with one deducts from the others — subtract the distance already moved from the new speed to find how far you can still go with it.

| Situation | Cost per foot moved |
|---|---|
| Normal | 1 ft |
| **Difficult terrain** | 2 ft (+1 ft extra per foot) |
| **Climbing / swimming / crawling** (no matching speed) | 2 ft |
| Climbing/swimming/crawling **through difficult terrain** | 3 ft |
| **Squeezing** through a space one size smaller than you | 2 ft (3 ft if also difficult terrain) |
| Standing up from **prone** | Costs **half your speed** (flat, not per foot); impossible if speed is 0 |
| Dropping **prone** | **Free** (no movement cost, no action) |

- Difficult terrain effects don't stack with each other — an area is either difficult or not.
- **Prone/crawling:** while prone your only movement option is crawling (2 ft per ft) unless you stand. Attack rolls against a prone creature have **advantage within 5 ft**, **disadvantage beyond 5 ft**; the prone creature attacks at **disadvantage** (`API: /api/2014/conditions/prone`).
- **Moving through creatures' spaces:** you can move through a **nonhostile** creature's space, and through a **hostile** creature's space only if it is **two or more sizes larger or smaller** than you. Any other creature's space is difficult terrain. You can never **end** your move in another creature's space (willingly).
- **Squeezing:** while in the smaller space you also have **disadvantage on attack rolls and Dexterity saving throws**, and attacks against you have **advantage**.
- **Flying and falling:** a flying creature **falls** if knocked prone, if its speed drops to 0, or if it otherwise loses the ability to move — unless it can hover or is held aloft by magic.
- **Being moved on someone else's turn** (shoved, thrown by a trap) doesn't spend your movement.

## Making an attack

Every attack — weapon, spell, or special — follows the same three steps:

1. **Choose a target** within range (creature, object, or location).
2. **Determine modifiers**: cover, advantage/disadvantage, anything else the DM applies.
3. **Resolve**: roll the attack; on a hit, roll damage.

### Attack roll anatomy

```
attack roll = d20 + ability modifier + proficiency bonus (if proficient) + other bonuses
hit if attack roll ≥ target AC
```

- **Melee weapon attack:** Strength modifier (or Dexterity with a **finesse** weapon).
- **Ranged weapon attack:** Dexterity modifier (or Strength with a **thrown** non-finesse weapon like a javelin).
- **Spell attack:** spellcasting ability modifier + proficiency bonus (always proficient).
- Weapon properties come from equipment data (`API: /api/2014/equipment-categories/weapon`).
- **Natural 20** on the d20: the attack **hits regardless of AC** and is a **critical hit**. **Natural 1**: the attack **misses regardless of modifiers**. These automatic-result rules apply **only to attack rolls** — never to ability checks or saving throws.
- **Reach:** melee reach is 5 ft unless the weapon or creature says otherwise (e.g. **reach** weapons: 10 ft).
- **Range (X/Y):** attacks beyond normal range X and up to long range Y are at **disadvantage**; beyond Y is impossible.

### Unseen attackers and targets

| Situation | Effect on attack roll |
|---|---|
| You attack a target **you can't see** | **Disadvantage** (you must guess the location; if the target isn't there, you miss — DM typically narrates a miss without confirming why) |
| You attack while **unseen by the target** (hidden, invisible, target blinded) | **Advantage** |
| You attack from hiding | Making the attack **reveals your location**, hit or miss |

If a creature is both unseen *and* unseeing relative to its target, the effects cancel to a straight roll.

### Ranged attacks in melee

Making a **ranged attack** (weapon or spell) while a **hostile creature that can see you and isn't incapacitated** is within **5 feet** of you imposes **disadvantage** on the roll.

### Two-weapon fighting

- Requirements: you take the **Attack action** attacking with a **light melee weapon** in one hand; you may then use a **bonus action** to attack with a **different light melee weapon** in the other hand.
- The bonus-action attack **does not add your ability modifier to damage** (unless the modifier is negative, or you have the Two-Weapon Fighting fighting style).
- Thrown light weapons qualify (you can throw both).

> **2024 note:** 2024 moves this to the weapon's **Light** property itself (attack as bonus action after attacking with a Light weapon) — the no-ability-mod-to-damage rule remains.

### Grapple (special melee attack)

- Replaces **one attack** within your Attack action. Requires a **free hand**; target must be **no more than one size larger** than you and within your reach.
- Contest: your **Strength (Athletics)** vs the target's choice of **Strength (Athletics) or Dexterity (Acrobatics)**. Win → target is **grappled** (`API: /api/2014/conditions/grappled`): its **speed becomes 0**, no bonuses to speed apply.
- **Escaping:** the grappled creature uses **its action** to repeat the contest (its Athletics or Acrobatics vs your Athletics). Success ends the grapple.
- Grapple also ends if the grappler is **incapacitated**, or if an effect removes the target from the grappler's reach (e.g. shoved away by *thunderwave*).
- **Moving a grappled creature:** you can drag or carry it, but your speed is **halved** unless the target is **two or more sizes smaller** than you.
- Grappling is not an attack roll: advantage/disadvantage on *attacks* doesn't apply, but conditions affecting ability checks do. It can't crit and auto-hit/auto-miss rules don't apply.

> **2024 note:** 2024 replaces the contest with an Unarmed Strike option forcing a **Strength or Dexterity saving throw** (DC 8 + Str mod + PB).

### Shove (special melee attack)

- Replaces **one attack** within your Attack action; target no more than one size larger, within reach.
- Same contest as grappling: your **Strength (Athletics)** vs target's **Athletics or Acrobatics**.
- Win → choose one: knock the target **prone**, or **push it 5 feet away** from you.

## Advantage and disadvantage

The universal roll modifier; attack modifiers above frequently resolve to one of these.

- **Advantage:** roll 2d20, take the **higher**. **Disadvantage:** roll 2d20, take the **lower**.
- **They never stack.** Any number of advantage sources = one advantage; same for disadvantage.
- **One of each cancels all of both:** if you have at least one source of advantage *and* at least one source of disadvantage — no matter how many of each — you roll a **single straight d20**.
- Rerolls (e.g. halfling Luck) apply to **one** of the two dice, your choice.
- Sheet model: `roll = adv && !dis ? max(d20, d20) : dis && !adv ? min(d20, d20) : d20` where `adv`/`dis` are booleans OR-ed over all sources.

### Combat sources at a glance

| You attack with **advantage** when… | You attack with **disadvantage** when… |
|---|---|
| Target can't see you (hidden, invisible, target blinded) | You can't see the target |
| Target is **prone** and you're within 5 ft | Target is **prone** and you're beyond 5 ft |
| Target is **restrained**, **stunned**, **paralyzed**, or **unconscious** | You are **prone**, **restrained**, **poisoned**, or **frightened** (of a visible source) |
| An ally used **Help** on that target (first attack only) | You make a ranged attack with a hostile creature within 5 ft |
| Target is **paralyzed/unconscious**: a hit from within 5 ft is also an **automatic critical** | Target took the **Dodge** action and can see you |
| — | Attacking at **long range**, or while **squeezing** |

## Conditions in combat — quick reference

Full text: `API: /api/2014/conditions`. Combat-relevant summary (a condition never stacks with itself; multiple sources = one instance, each source tracks its own end condition):

| Condition | Combat effect (exact) |
|---|---|
| **Blinded** | Auto-fails sight checks; attacks against it: advantage; its attacks: disadvantage |
| **Charmed** | Can't attack the charmer or target it with harmful effects; charmer has advantage on social checks |
| **Frightened** | Disadvantage on checks and attacks while source is in line of sight; can't willingly move **closer** to the source |
| **Grappled** | Speed 0, no speed bonuses; ends if grappler incapacitated or target removed from reach |
| **Incapacitated** | No actions, no bonus actions, no reactions (can still move and speak unless something else stops that) |
| **Invisible** | Unseen attacker rules: its attacks advantage, attacks against it disadvantage; still audible/traceable |
| **Paralyzed** | Incapacitated + can't move or speak; auto-fails Str/Dex saves; attacks against it advantage; **hits from within 5 ft are crits** |
| **Petrified** | Incapacitated, weight ×10, resistance to **all** damage, immune to poison/disease; auto-fails Str/Dex saves |
| **Poisoned** | Disadvantage on attack rolls and ability checks |
| **Prone** | Crawl only (2 ft/ft) unless it stands; its attacks disadvantage; attacks against it: advantage within 5 ft, disadvantage beyond |
| **Restrained** | Speed 0; attacks against it advantage; its attacks disadvantage; **disadvantage on Dex saves** |
| **Stunned** | Incapacitated + can't move, halting speech; auto-fails Str/Dex saves; attacks against it advantage |
| **Unconscious** | Incapacitated + prone, drops what it holds, unaware; auto-fails Str/Dex saves; attacks against it advantage; **hits from within 5 ft are crits** |
| **Exhaustion** | Levels 1–6: 1 disadvantage on checks; 2 speed halved; 3 disadvantage on attacks & saves; 4 HP max halved; 5 speed 0; 6 **death**. Effects cumulative; long rest with food/drink removes one level |

Sheet model: store conditions as a set of `{condition, sourceId, endTrigger}`; derive advantage/disadvantage flags and auto-fail flags from the union.

## Cover

Only the **most protective** degree applies (they don't stack):

| Cover | Grants | Example |
|---|---|---|
| **Half cover** | **+2** to AC and Dexterity saving throws | Low wall, another creature (friend or foe), furniture |
| **Three-quarters cover** | **+5** to AC and Dexterity saving throws | Portcullis, arrow slit, thick tree trunk |
| **Total cover** | **Can't be targeted directly** by attacks or spells (area effects can still reach it) | Fully behind a wall |

A target has cover only against attacks/effects originating on the other side of the cover.

## Damage and healing

### Damage roll

```
damage = weapon/spell dice + ability modifier (weapon attacks; spells only if the spell says so) + bonuses
```

- If a spell or effect hits **multiple targets simultaneously**, roll damage **once** and apply it to all of them.

### Critical hits

- On a crit, roll **all of the attack's damage dice twice** (weapon dice, sneak attack dice, smite dice — every die), then add relevant **modifiers once**. Modifiers and flat bonuses are **never doubled**.
- Example: greataxe crit with +3 Str = `2d12 + 3`, not `2 × (1d12 + 3)`.

### Damage types

`API: /api/2014/damage-types` — the 13 types: **acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder**. Types have no rules of their own; they interact with resistance, immunity and vulnerability.

### Resistance and vulnerability — order of operations

1. Compute total damage of a given type (dice + modifiers + flat bonuses/penalties).
2. Apply **resistance**: halve it (**round down**).
3. Apply **vulnerability**: double it.
4. Multiple *instances* of resistance to the same damage type count **only once** (they never stack); same for vulnerability.
5. Apply resistance **after** all other damage modifiers. Example: 25 bludgeoning into a creature with bludgeoning resistance and a −5 damage reduction aura: `25 − 5 = 20`, then halved → **10**.
6. **Immunity**: damage of that type becomes 0 (skip everything).

Sheet model per damage instance: `floor(max(0, raw − reductions) × (resistant ? 0.5 : 1) × (vulnerable ? 2 : 1))`, with immunity short-circuiting to 0.

### Hit points, dropping to 0

- HP range: `0 … hit point maximum`. Damage below half max has no rules effect (no wound penalties in 5e).
- **Instant death (massive damage):** if damage reduces you to 0 HP **and** the damage remaining after that reduction **≥ your hit point maximum**, you **die outright**. Formula: `die if (damage − currentHP) ≥ hpMax`. Example: 6 current HP, 30 max, takes 38 → 32 remaining ≥ 30 → dead.
- Otherwise, dropping to 0 makes you **unconscious** (`API: /api/2014/conditions/unconscious`) and **dying** — HP never goes negative; excess damage is discarded (except for the instant-death check).
- **Monsters** at 0 HP simply die (DMs may give major NPCs death saves).

### Death saving throws — state machine

State: `{ hp: 0, successes: 0–3, failures: 0–3, stable: bool, dying: bool }`.

While **dying** (0 HP, not stable), at the **start of each of your turns** roll a **death saving throw**: a plain **d20, no modifiers, DC 10**.

| Event | Transition |
|---|---|
| Roll 10–19 | `successes += 1` |
| Roll 2–9 | `failures += 1` |
| **Natural 1** | `failures += 2` |
| **Natural 20** | **Regain 1 HP** immediately — conscious, no longer dying; successes/failures reset |
| `successes == 3` | **Stable** (see below); counters reset |
| `failures == 3` | **Dead** |
| **Take any damage while at 0 HP** | `failures += 1`; if the damage is from a **critical hit**, `failures += 2`; if the damage ≥ hp max, instant death |
| **Regain any HP** (healing) | Conscious at that HP; dying ends; **successes and failures reset to 0** |
| **Stabilized by another creature** | An action + **DC 10 Wisdom (Medicine)** check, or the *spare the dying* cantrip (automatic) → **stable** |

**Stable** means: still at 0 HP and unconscious, but no more death saves. Taking damage while stable makes you **dying again** (and the damage-at-0 rule adds a failure). A stable creature that isn't healed regains **1 HP after 1d4 hours**.

Successes and failures **do not carry over**: both reset to 0 whenever you regain hit points or become stable.

### Healing

- Healing restores HP up to the **maximum**, never above; excess is lost.
- A creature at 0 HP that regains any HP returns to consciousness (it is still prone from being unconscious — standing costs half speed).
- **Healing does not work on the dead.** A creature dead from 3 failures or massive damage needs magic like *revivify*, not *cure wounds*.
- No general rule prevents healing an unwilling creature, but a creature can't be forced to spend Hit Dice.

### Temporary hit points

- **A separate pool**, tracked apart from HP: damage depletes temp HP **first**, then real HP.
- **They don't stack.** Gaining temp HP while you have some: **keep the higher value**, don't add.
- They are **not healing**. A creature at 0 HP can receive temp HP, but temp HP **do not restore consciousness** — only real healing does.
- Damage while at 0 HP that is **fully absorbed** by temp HP: the SRD says a creature at 0 "takes damage" causes a failure, but temp HP absorb the damage first. Rule it explicitly for your sheet — the common ruling is that damage fully soaked by temp HP causes **no** death-save failure; damage that gets through the temp HP pool does. Surface this as a DM toggle.
- They can **exceed your HP maximum** conceptually — they're not bounded by it.
- Duration: until depleted, until the granting effect's duration ends, or after a **long rest**.
- Sheet model: `tempHp: number` with `applyDamage(d): overflow = max(0, d - tempHp); tempHp = max(0, tempHp - d); hp -= overflow`.

### Knocking a creature out

- **Melee attacks only.** When you reduce a creature to 0 HP with a melee attack, you may **declare (at the moment the damage drops it) that you knock it out** instead: the creature falls **unconscious and stable** at 0 HP — no death saves, not dead.
- No penalty, no attack-roll change; it's purely a choice made on the killing blow.

## Mounted combat (brief)

- **Mounting/dismounting** a willing creature (one size larger, appropriate anatomy) within 5 ft costs movement equal to **half your speed**.
- If the mount is moved against its will or knocked prone while you ride, make a **DC 10 Dexterity saving throw** or fall off, landing **prone within 5 ft**. Same save if *you* are knocked prone.
- **Controlled mount:** acts on **your initiative**, moves as you direct, and can take only the **Dash, Disengage, or Dodge** actions.
- **Independent mount** (intelligent, or uncontrolled): keeps its own initiative and acts freely.
- Attackers can target you or the mount separately. If the mount provokes an opportunity attack while you're riding, the attacker chooses target: you or the mount.

## Underwater combat (brief)

- **Melee weapon attacks:** **disadvantage**, unless using a **dagger, javelin, shortsword, spear, or trident** (or the attacker has a swim speed).
- **Ranged weapon attacks:** automatically **miss beyond normal range**; within normal range, **disadvantage** unless the weapon is a **crossbow, net, or a thrown weapon** like a javelin (including spear/trident/dart).
- **Fire damage:** creatures and objects **fully immersed in water have resistance to fire damage**.

## Improvised damage guidance (DM)

For hazards without a stat block, pick dice by narrative severity:

| Dice | Severity | Examples |
|---|---|---|
| 1d10 | Minor hazard | Burned by coals, hit by a falling shelf, stumbling into a firepit edge |
| 2d10 | Dangerous | Struck by a swinging beam, brief contact with acid |
| 4d10 | Serious | Hit by falling rubble in a collapsing tunnel, lightning strike graze |
| 10d10 | Deadly | Crushed by compacting walls, hit by whirling blades, dunked in a vat of acid |
| 18d10 | Near-certain death for most | Submerged in lava, crushed beneath a colossal falling object |
| 24d10 | Cataclysmic | Caught at the heart of an elemental vortex or annihilating magic |

**Falling:** `1d6 bludgeoning per 10 feet fallen, maximum 20d6` (i.e. cap at 200 ft), landing **prone** unless damage is avoided entirely.

**Suffocation:** hold breath for `1 + CON modifier` minutes (minimum 30 seconds); after that, survive `CON modifier` rounds (minimum 1), then drop to **0 HP and dying** at the start of the next turn — no healing or stabilizing until air returns.

## Common table rulings

- **Q: Can I move, attack, then keep moving?** → A: Yes. Movement splits freely around actions and even between the attacks of Extra Attack; only the total is capped at your speed.
- **Q: Does circling around an enemy provoke an opportunity attack?** → A: No. Only leaving the creature's **reach** provokes; movement entirely within reach never does. Teleporting and forced movement never provoke.
- **Q: Do critical hits double my Sneak Attack / Divine Smite dice?** → A: Yes — a crit doubles **every die** the attack deals, from any source. It never doubles flat modifiers.
- **Q: Is a natural 20 an auto-success on a saving throw or ability check?** → A: No. Auto-hit (nat 20) and auto-miss (nat 1) apply **only to attack rolls** in the SRD (death saves are the special exception with their own nat-1/nat-20 rules).
- **Q: I'm at 0 HP and take damage from a melee crit — what happens?** → A: **Two** death-save failures (crit while down), and if the damage equals or exceeds your HP max you die outright instead.
- **Q: Does healing word from across the room get my ally up mid-fight?** → A: Yes. Any healing at 0 HP restores consciousness at the new HP total and wipes accumulated death-save successes/failures. The ally is still prone.
- **Q: Can two creatures grapple each other at the same time?** → A: Yes. Grappled sets **speed to 0** but doesn't prevent acting; mutual grapples just pin both in place until someone escapes (action) or a grappler is incapacitated.
- **Q: If I Ready a spell and never release it, do I lose the slot?** → A: Yes. The spell is cast when you Ready it; the slot is spent whether or not the trigger fires, and losing concentration wastes it too.
