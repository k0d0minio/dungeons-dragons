# 07 — Conditions

> Purpose: the exact mechanical text of all 15 SRD 5.1 (2014) conditions, plus the interactions and stacking rules DMs actually need mid-combat. (`API: /api/2014/conditions`)

## General rules for conditions

- A condition lasts until its cause says it ends (duration, save, remover effect).
- **Conditions don't stack with themselves**: multiple instances of the same condition don't compound — each just has its own duration/end trigger; the effects apply once. **Exception: exhaustion**, whose levels add.
- Different conditions apply simultaneously and their effects all apply (e.g. unconscious ⇒ also incapacitated and prone).
- If effects grant both advantage and disadvantage on the same roll, they cancel (see `01-core-mechanics.md`).

## The 15 conditions

### Blinded

- Can't see; automatically **fails any ability check that requires sight**.
- **Attack rolls against** the creature have **advantage**; the creature's **attack rolls** have **disadvantage**.
- Commonly inflicted by: darkness (effectively), *blindness/deafness*-type spells, *color spray*, some breath weapons and oozes.
- Ends: per the effect (save at end of turns, spell duration, *lesser restoration*).
- Interactions: blindsight/tremorsense sidestep the sight problem but do not remove the condition; a blinded creature can still target what it can otherwise sense — attacking an unseen target is what carries the disadvantage, already baked in here.

### Charmed

- **Can't attack the charmer** or target the charmer with harmful abilities or magical effects.
- The charmer has **advantage on ability checks to interact socially** with the creature.
- Commonly inflicted by: *charm person*, vampire-style gaze effects, fey and fiend abilities.
- Ends: spell duration, taking damage from the charmer or allies (for many charm effects, per their text), *calm emotions* suspends it, immunity blocks it.
- Interactions: charmed is **not** mind control — the creature can still fight the charmer's allies, flee, or refuse requests. Only "charm" effects that add their own commands (e.g. *dominate*-style) compel behavior, and those effects say so explicitly.

### Deafened

- Can't hear; automatically **fails any ability check that requires hearing**.
- Commonly inflicted by: *thunderwave*-scale booms (DM ruling), *blindness/deafness*, *silence* (in-area you can't hear or be heard).
- Ends: per the effect; *lesser restoration*.
- Interactions: a deafened caster can still cast verbal-component spells (V requires *speaking*, not hearing yourself — though *counterspelling* a caster inside *silence* is moot since V spells fail there, that's the silence rule, not deafened). Passive Perception based on hearing effectively fails.

### Exhaustion

Exhaustion comes in **six cumulative levels**; a creature suffers **its level's effect and all lower levels' effects**.

| Level | Effect (2014) |
|---|---|
| 1 | Disadvantage on **ability checks** |
| 2 | **Speed halved** |
| 3 | Disadvantage on **attack rolls and saving throws** |
| 4 | **Hit point maximum halved** |
| 5 | **Speed reduced to 0** |
| 6 | **Death** |

- **Gaining levels**: each qualifying effect adds levels (going without food/water, forced march past 8 hours, some monster abilities, a frenzy-style class feature, extreme environments). Multiple causes stack levels.
- **Removing levels**: finishing a **long rest with food and drink** removes **1 level**. *Greater restoration* removes 1 level. Nothing in the SRD removes multiple levels at once.
- If already exhausted, a new cause raises the current level by the stated amount.

> **2024 note:** exhaustion is redesigned — each level gives a flat **−2 to all d20 Tests** (checks, attacks, saves) and **−5 ft speed** per level, cumulative; death still occurs at level 6; a long rest still removes 1 level.

### Frightened

- **Disadvantage on ability checks and attack rolls while the source of fear is within line of sight**.
- **Can't willingly move closer** to the source of its fear.
- Commonly inflicted by: *fear*, dragon Frightful Presence, undead auras.
- Ends: save at end of turns (most sources), source out of sight suspends the roll penalties (the movement ban still applies), *calm emotions*.
- Interactions: can still attack the fear source (at disadvantage), can be moved closer *unwillingly* (forced movement is fine); "within line of sight" means the penalties switch off around a corner even while the condition persists.

### Grappled

- **Speed becomes 0** and can't benefit from any bonus to speed.
- Ends when: the **grappler is incapacitated**; an effect **removes the grappled creature from the grappler's reach** (e.g. *thunderwave* shove); or the target escapes — action, its **Athletics or Acrobatics** vs the grappler's Athletics.
- Commonly inflicted by: the grapple attack option (Strength (Athletics) vs target's Athletics/Acrobatics, target ≤ one size larger, needs a free hand), monster grabs (which set a fixed escape DC instead).
- Interactions: grappled imposes **no** attack penalties either way — a grappled creature fights normally. The grappler moves at **half speed** while dragging the target (full speed if the target is 2+ sizes smaller). Grappling is not restraining; monsters that also restrain say so.

### Incapacitated

- **Can't take actions or reactions.**
- That is the entire condition — movement and speech are unaffected by incapacitated *itself*.
- Commonly inflicted by: rarely alone; mostly arrives inside other conditions (stunned, paralyzed, petrified, unconscious) or effects like *hypnotic pattern*.
- Ends: with whatever imposed it.
- Interactions: the keystone condition — **incapacitated breaks concentration** on spells, ends grapples the creature is maintaining (grappler incapacitated ⇒ target freed), and denies opportunity attacks and all other reactions. Bonus actions are actions? No — "actions" here includes bonus actions per the action rules (you take a bonus action on your turn; being unable to take actions removes it — RAW consensus: incapacitated creatures take no actions, bonus actions, or reactions).

### Invisible

- **Impossible to see without magic or a special sense**; for hiding purposes, treated as **heavily obscured**.
- The creature's **location can still be detected** by noise and tracks; invisibility is not silence and not hiding — a Stealth check is still needed to be *unlocated*.
- **Attack rolls against** the creature have **disadvantage**; the creature's **attack rolls have advantage**.
- Commonly inflicted (granted) by: *invisibility* (breaks on attacking or casting), *greater invisibility* (doesn't break), some monster traits.
- Ends: spell end/break condition, *see invisibility*/truesight negates the sight benefit.
- Interactions: an attacker with *see invisibility*, blindsight, or truesight negates both the advantage and disadvantage — the invisible creature is, to that attacker, an ordinary target. Two creatures who can't see each other attack each other with adv+dis = straight rolls.

### Paralyzed

- **Incapacitated** (no actions or reactions) and **can't move or speak**.
- **Automatically fails Strength and Dexterity saving throws.**
- **Attack rolls against** the creature have **advantage**.
- **Any hit from an attacker within 5 feet is a critical hit.**
- Commonly inflicted by: *hold person/monster* (repeat save each turn), ghoul claws (CON save), certain venoms.
- Ends: save at end of turns (spell versions), duration, or *lesser restoration* (paralyzed is one of its four listed conditions).
- Interactions: the deadliest non-terminal condition — melee auto-crits plus auto-failed DEX saves (a *fireball* on a paralyzed target is a failed save, full damage). Verbal spell components are impossible (can't speak). Concentration: paralyzed doesn't break it directly, but its incapacitated component **does**.

### Petrified

- Transformed (with nonmagical worn/carried items) into **inanimate solid substance**; **weight ×10**; **ceases aging**.
- **Incapacitated**, **can't move or speak**, **unaware of its surroundings**.
- **Attack rolls against** it have **advantage**; **automatically fails STR and DEX saves**.
- **Resistance to all damage.**
- **Immune to poison and disease** (existing poison/disease is suspended, not cured).
- Commonly inflicted by: basilisk/medusa-style gazes (usually a two-stage save: restrained, then petrified), *flesh to stone*.
- Ends: *greater restoration*, the petrifier's own reversal clause (e.g. basilisk-gut oil), spell end.
- Interactions: no auto-crit clause (unlike paralyzed/unconscious) and resistance to all damage makes smashing risky rather than trivial; the statue is an object-like creature — most DMs rule destruction of the statue is death.

### Poisoned

- **Disadvantage on attack rolls and ability checks.**
- Saving throws are **unaffected** — the most-forgotten detail.
- Commonly inflicted by: venoms, poison gas, drow-style toxins, *contagion*-class effects, ingested poisons.
- Ends: duration, save repeats, *lesser restoration* / *protection from poison*; dwarven-style resilience gives advantage on the saves and resistance to the damage but not immunity to the condition.
- Interactions: poison **damage** and the poisoned **condition** are separate things — resistance/immunity to poison damage does not by itself grant condition immunity (creatures that have both say both).

### Prone

- Only movement option is to **crawl** (each foot costs 1 extra foot; +1 more in difficult terrain, i.e. 1 ft costs 3 ft) — unless it stands up.
- **Disadvantage on its own attack rolls.**
- Attack rolls against it: **advantage if the attacker is within 5 feet**, otherwise **disadvantage**.
- **Standing up costs half your speed** (round down; can't stand if speed is 0), uses no action.
- Commonly inflicted by: shove attacks (contest), *thunderwave*-type knockdowns, being knocked prone by trips, going prone voluntarily (free, costs no movement).
- Ends: stand up on your turn.
- Interactions: dropping prone is a free defensive move vs distant archers (they take disadvantage) but suicidal in melee (they gain advantage). A flying creature knocked prone falls. Mounted characters knocked off are prone in an adjacent space.

### Restrained

- **Speed 0**, no speed bonuses (as grappled), **plus**:
- **Attack rolls against** it have **advantage**; its **own attack rolls have disadvantage**.
- **Disadvantage on Dexterity saving throws.**
- Commonly inflicted by: nets (escape DC 10 STR or cut free), *entangle* (STR check to break), *web*, manacles-in-fiction, grab-and-restrain monster traits.
- Ends: per the source — usually an escape check (STR/Athletics or DEX/Acrobatics) as an action, or destroying the restraint.
- Interactions: strictly worse than grappled. Casting is unimpeded (hands assumed free unless the source says otherwise — *web* etc. don't stop somatic components RAW; DMs vary). DEX-save disadvantage makes area spells against restrained targets a strong play.

### Stunned

- **Incapacitated** (no actions/reactions), **can't move**, and **can speak only falteringly**.
- **Automatically fails Strength and Dexterity saving throws.**
- **Attack rolls against** the creature have **advantage**.
- Commonly inflicted by: monk Stunning Strike (CON save, until end of monk's next turn), mind-assault effects, *power word stun*.
- Ends: usually end of a specified turn or a repeated save.
- Interactions: paralyzed minus the auto-crit and minus the movement/speech totality. Breaks concentration (incapacitated). The premier "shut down the boss for a round" condition — legendary-tier monsters often have condition immunity to it for exactly that reason.

### Unconscious

- **Incapacitated**, **can't move or speak**, **unaware of its surroundings**.
- **Drops whatever it's holding and falls prone.**
- **Automatically fails Strength and Dexterity saving throws.**
- **Attack rolls against** it have **advantage**.
- **Any hit from an attacker within 5 feet is a critical hit.**
- Commonly inflicted by: dropping to **0 hit points** (then death saves begin), *sleep*, being knocked out (attacker's choice on the melee blow that would drop a creature to 0: knock out instead — stable and unconscious).
- Ends: regaining 1+ HP, damage/shake awake (magic sleep varies by source — *sleep* ends on damage or an action to wake), becoming stable then regaining HP after 1d4 hours.
- Interactions: the full package — includes **incapacitated + prone + auto-fail STR/DEX saves + advantage against + melee auto-crit**. A melee hit on an unconscious dying PC = crit = **two failed death saves**; any damage while at 0 HP causes death-save failure(s), and damage ≥ HP max remaining is instant death.

## Condition overlap and stacking summary

| Condition | Includes incapacitated? | Breaks concentration? | Attacks *against* target | Target's own attacks | Auto-fail STR/DEX saves? |
|---|---|---|---|---|---|
| Blinded | No | No | Advantage | Disadvantage | No |
| Charmed | No | No | — | — (can't target charmer) | No |
| Deafened | No | No | — | — | No |
| Exhaustion 1–5 | No | No | — | Dis at lvl 3+ | No (dis at lvl 3+) |
| Frightened | No | No | — | Disadvantage (source in sight) | No |
| Grappled | No | No | — | — | No |
| Incapacitated | (itself) | **Yes** | — | No actions at all | No |
| Invisible | No | No | Disadvantage | **Advantage** | No |
| Paralyzed | **Yes** | **Yes** | Advantage (+ crit ≤ 5 ft) | None possible | **Yes** |
| Petrified | **Yes** | **Yes** | Advantage | None possible | **Yes** |
| Poisoned | No | No | — | Disadvantage | No |
| Prone | No | No | Adv ≤ 5 ft / Dis beyond | Disadvantage | No |
| Restrained | No | No | Advantage | Disadvantage | No (dis on DEX saves) |
| Stunned | **Yes** | **Yes** | Advantage | None possible | **Yes** |
| Unconscious | **Yes** | **Yes** | Advantage (+ crit ≤ 5 ft) | None possible | **Yes** |

Additional cross-cutting facts:

- **Concentration** also breaks on: casting another concentration spell, failing the damage CON save (DC max(10, damage/2)), and death. The table column covers only the condition-driven break (any condition containing incapacitated).
- **Auto-crit within 5 ft** exists on exactly two conditions: **paralyzed** and **unconscious**.
- **Speed 0** conditions: grappled, restrained (and stunned/paralyzed/petrified/unconscious via "can't move"; exhaustion 5 sets speed 0). You can't stand from prone with speed 0.
- Condition **immunities** on stat blocks block the condition entirely, including from environmental or grapple sources.

## What removes or suppresses conditions

SRD spells and effects that clear conditions, for building a "cure" helper:

| Remover | Clears |
|---|---|
| ***Lesser restoration*** (2nd) | One of: **blinded, deafened, paralyzed, poisoned** — or one disease |
| ***Greater restoration*** (5th) | One of: **1 exhaustion level, charmed, petrified**, one curse/attunement-curse, one ability-score reduction, one HP-max reduction |
| ***Calm emotions*** (2nd) | **Suppresses charmed and frightened** for the duration (they resume after, if time remains) |
| ***Freedom of movement*** (4th) | Magic can't reduce speed or cause **paralyzed/restrained**; escape a grapple by spending 5 ft of movement; ignore difficult terrain |
| ***Heal*** (6th) | Ends **blinded, deafened**, and disease (plus 70 HP) |
| **Long rest** | 1 exhaustion level (with food and drink); most short-duration conditions expire on their own long before |
| **Repeated save** | Many sources grant a new save at the end of each of the target's turns — only when the effect says so; there is no universal retry rule |
| **Death of source / source incapacitated** | Grapple ends on grappler incapacitation; concentration-based conditions (e.g. *hold person*) end when the caster's concentration breaks |

## Duration patterns (for data modeling)

Every SRD condition instance fits one of these shapes — useful for a character-sheet condition tracker:

1. **Timed**: fixed duration, no retry (e.g. poisoned for 1 hour). Store: end time.
2. **Save-ended**: repeat save at end of target's turns (e.g. *hold person*). Store: save DC, ability, retry timing.
3. **Until removed**: persists until a specific remover (petrified until *greater restoration*; exhaustion until rests/restoration). Store: valid removers.
4. **Condition-linked**: derived from another state, ends with it (prone until you stand; unconscious until above 0 HP; grappled until escape/rescue). Store: parent state.
5. **Leveled**: exhaustion only — an integer 0–6, not a boolean.

## Common table rulings

**Q: Restrained and prone at once — attacker 30 ft away has advantage (restrained) and disadvantage (prone at range). What applies?**
A: They cancel: straight roll. Adjacent attackers would have advantage twice over, which is still just advantage.

**Q: Does the poisoned condition affect saving throws?**
A: No. Attack rolls and ability checks only. (Concentration saves are CON saves, so they're also unaffected.)

**Q: Ranged attack against a paralyzed target from 60 ft — auto-crit?**
A: No. The auto-crit requires the attacker to be **within 5 feet**. The ranged attack has advantage and, on a hit, auto-fails nothing extra — but the target does auto-fail any STR/DEX save the attack rider forces.

**Q: My grappler got stunned. Does the grapple hold?**
A: No. Stunned includes incapacitated, and grappled ends when the grappler is incapacitated. The target is free immediately.

**Q: Can a charmed PC attack the charmer's allies or walk away?**
A: Yes to both. Charmed only forbids attacking/harming **the charmer** and gives the charmer social advantage. Compulsion requires an effect that says it compels.

**Q: Invisible attacker vs a defender with blindsight — who has the edge?**
A: Neither, within blindsight radius: the special sense perceives the attacker, so invisibility grants no advantage and imposes no disadvantage there.

**Q: Melee hit on an unconscious PC at 0 HP — what exactly happens?**
A: Within 5 ft it's an automatic critical hit, and damage while at 0 HP inflicts death-save failures — **two** for a crit. One more failure (or a second such hit) kills. If the damage equals or exceeds the PC's HP maximum, death is instant regardless of saves.

**Q: Two ghouls paralyze the fighter on consecutive rounds. Two conditions?**
A: Two instances, one effect. The fighter is paralyzed once mechanically, but must clear **each** instance (each has its own save/duration) before the condition ends. Same-condition instances never deepen the effect — only exhaustion has levels.
