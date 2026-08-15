# DND-033 · Rests and recovery — one action, not fifteen taps

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P2 |
| Size | M |
| Sources | product lens · market lens · data lens · `src/lib/characters/combat.ts:146` · `src/components/characters/sheet/spell-slots-card.tsx:51-71` · `docs/rules/09-adventuring.md:96` |

## Problem

Nothing in the app knows what a rest is, and rests happen at least once a session.

After a long rest a level-9 wizard restores spell slots by tapping fifteen individual pips —
`regainSlot` (`src/lib/characters/combat.ts:146`) restores one slot per call and is the only
restore path, with one button per pip at `spell-slots-card.tsx:51-71`. Hit points are reset the
same way, one tap at a time.

Short rests are worse: they are *defined* by spending hit dice, and hit dice do not exist in the
schema at all. A repo-wide grep for `rest` or `hit dice` returns nothing in `src/`. So a short
rest is entirely off-app, on paper.

The market lens is clear that this is table stakes and cheap: D&D Beyond puts a campfire control
next to the character portrait, one tap, and it spends hit dice as part of the rest flow rather
than after it. Building rests without hit dice ships a button only long rests can use.

The rules are already written down in this repo — `docs/rules/09-adventuring.md:96` carries the
"what recovers on which rest" table.

Schema gap beyond hit dice: there is nowhere to record class resources that rests restore —
rage uses, ki points, channel divinity — and `SpellSlotState` (`schema.ts:32`) is `{max, used}`
per level with no marker for which pools return on a **short** rest, which is how warlock pact
magic works.

## Acceptance

- [ ] A long rest is one action that restores hit points, spell slots and everything else 5e
      says it restores
- [ ] A short rest is one action that lets hit dice be spent, and restores what a short rest
      restores — including warlock pact slots
- [ ] Hit dice are stored, spent, and restored on a long rest per the rules
- [ ] The rest control is reachable in one tap from the sheet, at 44px, one-handed
- [ ] A rest taken by mistake can be undone, or is confirmed before it applies
- [ ] Class resources that rests restore are either handled or explicitly scoped out, and the
      register updated to say which
- [ ] CI green

## Prompt

Add rests and recovery to the D&D 5e Companion's character sheet.

Today nothing in the app knows what a rest is. `regainSlot` at
`src/lib/characters/combat.ts:146` restores exactly one slot per call, and
`src/components/characters/sheet/spell-slots-card.tsx:51-71` gives one button per pip — so a
level-9 wizard's long rest is fifteen taps. Hit dice do not exist anywhere in the schema, which
means short rests are entirely off-app.

The rules you need are already in this repo: `docs/rules/09-adventuring.md:96` has the table of
what recovers on which rest. Follow it rather than working from memory.

**Hit dice are part of this ticket, not a follow-up.** A short rest is defined by spending them
— building a rest button without hit dice ships something only long rests can use. That needs a
schema addition (total and spent, derived from class and level), and per the register's standing
rule the migration must be additive and nullable.

**Warlocks are the trap.** Pact magic slots return on a *short* rest, and `SpellSlotState`
(`src/lib/db/schema.ts:32`) is `{max, used}` per level with no marker for which pools recover
when. Whatever you add has to express that. The schema comment at `:22-27` already explains why
slot maxima are stored rather than derived — same reasoning, extended.

There is a third gap worth a decision rather than silent omission: class resources that rests
restore — rage uses, ki points, channel divinity — have nowhere to live. Either handle them or
scope them out explicitly and say so in the PR, so the next person does not rediscover it.

**Ergonomics:** D&D Beyond puts this one tap from the character portrait, and that is the right
bar. One tap to open, one to confirm, 44px targets, no modal stack. Match the existing sheet
cards, which are already correct. A rest applied by accident wipes a session's state, so confirm
or make it undoable.

**Multiclassing is out** (register decision D15) — build hit dice against the single
`class_index`.

Read `.icm/intake/DND-033-rests-and-hit-dice.md` and `.icm/project.md` for context. Open a PR on
a `claude/` branch; do not run local checks — CI is the source of truth.
