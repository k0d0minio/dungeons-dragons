# Value audit — 2026-08-16

> Requested by Jamie: "audit it from a value perspective — what else would a D&D app
> have to facilitate gameplay and understanding; think of new features and of improving
> existing ones; put suggestions down as tickets flagged with a decision to be made by
> me." Every suggestion below is a ticket in `.icm/intake/`, `Status: blocked`, each
> carrying a **Decision — Jamie** section with unticked options (including "kill").
> Nothing here is a verdict; per the standing rule, the checkboxes are yours.

## Method

One full-codebase survey (routes, sheet anatomy, reference browser, DM tools, creation
and level-up, rules pages), read against the register's decisions and kill list. Every
ticket cites the code it's grounded in. The register's kills are respected, not
re-litigated: no dice roller (D8), no offline data (D2/D28), no social features, no
multiclassing (D15), no onboarding/tutorial apparatus.

## The tickets, grouped by theme

**Live combat state — the sheet's job, done more completely**

| Ticket | One line | The decision |
| --- | --- | --- |
| DND-049 | Concentration tracking — the most-forgotten rule in 5e; the app is silent on it | minimal flag / wired-in prompts / kill |
| DND-050 | Cast flow — spend a slot *from* the spell; search the sheet's spell list | full flow / search only / both / kill |
| DND-057 | Condition durations — "until end of next turn" as state, not memory | round-stamp nudge / real expiry / kill |
| DND-062 | Ammo and item charges — countable things that count down | ammo on attacks / + charges / kill |
| DND-063 | Inspiration — one boolean the whole table can see | build / kill |

**DM side — running the fight, not just listing it**

| Ticket | One line | The decision |
| --- | --- | --- |
| DND-054 | Encounter difficulty — XP-budget math, live while building | in add-flow / verdict only / kill |
| DND-055 | XP tracking — decision-first: likely dead if the table levels by milestone | XP table / milestone (kill) |
| DND-056 | Boss fights — monster AC on the row; legendary, lair, recharge counters | AC only / full boss kit / kill |
| DND-059 | Loot handout — DM pushes coins/items to the party, split done for you | build / currency only / kill |

**Understanding — the app teaching the game it tracks**

| Ticket | One line | The decision |
| --- | --- | --- |
| DND-053 | Ship the nine rules chapters already written in `docs/rules/` + a `/rules` index | player set / all / index only / kill |
| DND-051 | Reference filters — find spells by level/school, monsters by CR, items by rarity | tick facets per type / kill |
| DND-052 | Favourites and recents — zero-typing repeat lookups | per-device / per-account / recents only / kill |

**Character model — where the sheet stops matching the rulebook**

| Ticket | One line | The decision |
| --- | --- | --- |
| DND-058 | Campaign and session notes — the register's oldest `wanted`; blocked on your open question (typed during play or after?) | after / during / + player notes / kill |
| DND-060 | Creation form value pass — derive level-1 HP, surface racial bonuses, starting equipment | incremental / revive the wizard / kill |
| DND-061 | Subclasses and ASI — the planner skips both; open question about the table's builds | SRD subclasses + ASI / ASI only / label only / kill |

Suggested reading order if deciding in one sitting: the P1s first — DND-049, DND-053,
DND-058, DND-061 — they're the ones where the gap bites hardest or the answer unblocks
the register's own open questions.

## Considered and *not* ticketed

Recorded so the next audit doesn't re-derive them:

- **Anything on the kill list.** Dice roller, offline data, social, multiclassing,
  onboarding — all stand as decided.
- **A player-facing campaign screen.** Players currently have only the join page; but at
  one physical table the party glance is the DM's tool and the table screen already
  serves the shared view. If DND-058 ships player-visible notes, the smallest read
  surface gets designed there — a full player campaign page wasn't worth its own ticket.
- **Damage types, resistances and vulnerabilities on PCs.** Real rule, but the modelling
  cost (typed damage on every HP tap) would slow the one-tap damage flow that is the
  sheet's best feature. The raging barbarian keeps halving in their head.
- **Encumbrance / carry weight.** Already explicitly scoped out in the schema by a prior
  ticket; nothing in this audit changed that calculus — almost no table plays it.
- **Action-economy markers** (action/bonus/reaction used this round). High fidelity,
  high fiddle; per-turn tapping overhead for state that resets every six seconds of
  fiction. The tracker's turn advance would outpace players' bookkeeping.
- **Encounter templates / duplication.** Encounters already persist between sessions
  (D17); reuse-by-rebuilding is cheap at this table's scale.
- **Group/mob initiative.** Real friction at 20 goblins, but MAX_MONSTER_BATCH waves are
  rare and the per-row Roll button copes; revisit if a horde fight actually hurts.
- **Character export / print / PDF.** The app *is* the sheet; a paper fallback would be
  a second source of truth, which the register's "the sheet wins" stance argues against.
- **Spell component enforcement.** Reference shows V/S/M; policing a focus or a 100 gp
  pearl is DM adjudication, not app state.

## Housekeeping noticed in passing (not ticketed, too small)

- `src/app/api/dnd5e/spells/route.ts` has a comment claiming it handles URL parameters;
  it takes none. DND-051 fixes it if built; otherwise a one-line cleanup.
- `README.md` still says "no service worker and no PWA install step" — stale since
  DND-048 shipped both. Next docs pass should catch it.
