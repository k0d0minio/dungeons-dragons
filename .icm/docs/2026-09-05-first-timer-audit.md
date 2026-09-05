# First-timer audit — 2026-09-05

> Requested by Jamie: sign in to production, run through every page, and work out what a
> table of complete beginners — and a first-time DM — need from the app to create,
> prepare and run the first campaign; gear every suggestion to a first-timer, cutting
> complexity where it is not needed; hold the interrogation; then cut the tickets.
> Companion research brief: [2026-09-05-first-timer-research.md](2026-09-05-first-timer-research.md).
> The tickets it produced are the `first-table` epic and a batch of triage stubs in
> `.icm/intake/`. Nothing below is a verdict — the decisions section records Jamie's.

## Method

Signed in as Jamie (the one `dm`) at `https://dungeons-dragons.jamienisbet.com` from a
scripted iPhone-sized Chromium, and walked every route in `src/app/`: the front door,
`/characters`, the whole creation wizard to the last step (not submitted), the Library
and a search, `/learn` and three of its pages, `/rules` and the quick reference, the DM
home, the Tutorial campaign and all four prep pages, the settings, the session log, the
encounter builder, the player campaign view, every party member's sheet across all four
segments (**read-only** — no HP, rest or condition control was touched on anyone's real
character), the edit form, the level page, the crib and the users page. Then read the
code behind each finding. No player credentials exist for this session, so the player
experience is inferred from the DM's view of their sheets (the same component) and from
the code paths that differ for an owner.

## The clock and the table, as found

- **Session 1 is Thursday 10 September 2026 — five days away.** One session plan
  exists ("Session 1 - Intro", dated, not announced) and it is empty: no strong start, no
  scenes, no secrets, nothing linked. The campaign has **0 NPCs, 0 places, 0 handouts and
  0 encounters**. Nothing has been revealed. The app has not yet been used to prep.
- **Ten accounts**: Jamie plus nine. Seven hold exactly one character and one campaign
  seat; one holds a character and no seat; one holds a seat and no character; one
  (`cunha@example.com`) looks like a test account. Nobody has two characters. Jamie has
  none.
- **Seven characters on the Tutorial roster, all level 1**: Paladin, Druid, Wizard,
  Warlock, Sorcerer, Fighter, Bard. Five of the seven cast spells. There is no Rogue,
  Ranger or Monk — the wizard's own party hint says so on the class step. One character
  carries a name the table may want a word about.
- **Every one of the seven has already been made** — so anything that changes creation
  helps the *next* character, and anything that fixes these seven has to reach rows
  that already exist.

## A. What bites on Thursday — found on the seven real sheets

Ranked by what it costs at the table. These are the first tickets in the epic.

1. **Nobody has a weapon equipped, so nobody has an attack.** All seven Play segments
   read "Equip a weapon in Inventory to see attacks." The Fighter's only attack is
   "Unarmed strike 4 bludgeoning +5"; the Paladin, whose backpack holds a longsword, six
   javelins, a spear and a shortbow, has the same. The wizard's `startingInventory`
   equips only armour (`isWearable` — `wizard.ts:646`) and never a weapon. On Thursday,
   the first thing seven beginners will be asked is "what do you roll to attack", and
   the screen built to answer it is blank — the fix lives in Gear, behind a toggle
   labelled *Equipped* on a row labelled *Longsword*, which is exactly the trip the
   sheet was designed to spare them.
2. **Five of the six casters have no spell slots.** Paladin, Druid, Warlock, Sorcerer and
   Bard all show "No slots set up yet. A level 1 X gets the standard table." with a
   *Use the standard slots* button; only the Wizard's player found it (2/2). The
   creation wizard never writes `spellSlots`, and the cast flow only offers *Cast* on a
   levelled spell once a slot exists — so Bless, Cure Wounds, Hex, Burning Hands and
   Healing Word cannot be cast from five sheets until their owners press a button no
   beginner has a reason to look for.
3. **The party glance shows the wrong armour class.** It prints the stored column
   (`party-glance.tsx:99`), which is the *unarmoured* number; the sheet's Gear segment
   derives the real one from equipped armour. Ava's sheet says AC 18 (gear + shield); the
   glance says 10. Melnur: 16 on the sheet, 11 on the glance. LochDeen: 12 vs 10. The
   number the DM reads to decide whether a goblin hits is wrong for every armoured
   character. `/characters` (the list card) reads the same column.
4. **Weapon Mastery is never chosen.** The wizard writes `masteredWeaponIndexes: null`
   (`wizard.ts:1154`); the edit form shows "0 of 2 weapons chosen"; the Me segment says
   "Not recorded". For a beginner the 2024 mastery property is one word on the attack
   row (Sap, Vex, Topple) that they will be asked about the first time it matters —
   either it should be there, chosen for them from the kit, or the whole subsystem
   should wait behind a gate. That is a decision, below.
5. **Nothing tells the players when the session is.** `campaign_session_plans` has a
   public "announced" layer by design, but no control announces a night and the player
   campaign view does not show one. The date of Thursday exists only on the DM's
   screen.

## B. The ownership model Jamie asked for

What the app does today, against the three rules Jamie set on 2026-09-05.

- **"One user is one character."** The model is one-to-many: `/characters` is a list
  with a *New* button, `/` redirects to the list when a player has several, and the
  join page offers a picker ("Pick which of your characters play at this table"). Nothing
  stops a second creation. In practice nobody has two — so the rule can be enforced
  before it is ever broken, and the list, the picker and the *New* button all become
  unnecessary surface for a player. What a second creation should mean (a fresh start
  that replaces the first, or a refusal) is a decision, below.
- **"The DM does not create a character."** Signed in as Jamie, `/` redirects to
  `/characters/new` — the DM is the one account the app actively pushes into the
  wizard, because he has no character and the front door is character-first. His tab
  bar carries *Character* as its home stop, which for him leads to "Let's make your
  first character". `POST /api/characters` accepts any session. The DM's front door
  should be `/dm`, and the *Character* stop has no job on his bar.
- **"The DM sees, edits and annotates player characters in a profile view."** Seeing
  and editing exist (D13): the glance row opens the real sheet, and *Edit* and *Manage
  level* both work for the DM through the viewer predicate (the comments on the edit
  and level pages still say "owner-only" — they are stale, not wrong in behaviour).
  What does not exist: any DM-private note about a character (the one notes table is
  owner-only), who plays it (no account name on the sheet — the DM has to match
  "Wobbles Wobbleton II" to a friend by memory), and the readiness view the Lazy DM's
  first prep step asks for ("review the characters"). A profile is a new page, and the
  annotations are a new table.

## C. Complexity a first table does not need

Candidates only — each one is a decision in the Q&A below. The gates (D40) already
hide spell preparation, conditions, coins, class resources and XP; these are what the
gates do not reach.

- **Heroic Inspiration** has a card on the Play segment of every sheet, ungated.
- **Every inventory row carries four controls** — Equipped, Attuned, Notes, Remove — for
  a level-1 kit of arrows, a quiver, a healer's kit and a gaming set. Attunement is a
  magic-item rule nobody at this table will meet before level 3.
- **Hit dice, death saves, concentration, rests** — all needed, all on Play, all read at
  the moment they matter. Probably right as they are; the research brief says which the
  first session actually reaches.
- **The Library opens on Spells, alphabetically from Acid Arrow.** Six type chips, three
  rules chips, twelve cards and *Show 12 more*. A beginner opening it mid-session has one
  question ("what does Prone do", "what is a Bugbear") and is met with a browser.
- **The encounter builder's monster list opens on Aboleth and twenty dragons.** The
  search box is above it, but a first-time DM's eye lands on CR 24 before CR 1/4.
- **The Me segment says "Not recorded" three times** on a level-1 sheet (subclass,
  mastery, feats), which reads as three things the player forgot to fill in. The honest
  words are "at level 3" and "none yet".
- **"AC 11 · manual"** on an unarmoured character who typed nothing; **"Assumes
  proficiency with equipped weapons"** under every attack list.
- **Wizard copy says eight steps; a Fighter walks seven** (no spells step).

## D. The campaign lifecycle — where the app helps and where it is silent

*Create.* A campaign is a name. Invites live on `/dm/users`, the join link on the
campaign page, the gates on a settings page — three places for the "get everyone in and
set the table up" job, with no order between them. There is no session-zero anywhere:
the plan template is Lazy-DM session prep (strong start, scenes, secrets, treasure),
which is the right shape for session 1 and the wrong one for the evening before it.

*Prepare.* NPCs, places, handouts, plans and the priced encounter builder are all there
and all empty. The Lazy DM's eight steps map onto them except the first — *review the
characters* — which is the DM profile view (§B). Everything the DM writes stays his
until revealed (D38), which is right.

*Run.* Initiative, per-monster HP, stat blocks over the fight, the crib, quick notes,
reveals, the table screen and the session log exist and were not exercised here (no
encounter exists to run). The glance's AC (§A.3) is the one thing on the run path that
is wrong.

*Between sessions.* Recap, milestone, the level planner (which the DM can open for a
player) all exist. Players have no next-session date (§A.5) and no way to be told that
a level is waiting other than opening their sheet — which D25 accepts.

## E. Small bugs and copy — triage

- `src/app/characters/[id]/level/page.tsx:64` — the title is a JS template string, so
  `&rsquo;` is rendered literally: "Manage Ava Delacroix&rsquo;s level".
- `/characters/[id]/edit` throws React #418 (a hydration mismatch) in production; the
  page renders regardless.
- The Library's footer still says "Powered by D&D 5e API" — the proxy was retired by
  `long-tail-reference-data`.
- Inventory rows are named by `formatReferenceIndex`: "Healers-Kit", "Chain-Mail",
  "Priests-Pack"; and the Soldier kit lands an item literally named "Gaming Set (same as
  above)" — the SRD's own cross-reference (`backgrounds.json:69`) parsed as a custom
  item name.
- The DM home counts "9 members" where the campaign page counts "8 players" for the
  same table (one includes the DM's seat).

## What the research adds

The companion brief is the evidence; this is what it changed about the picture above.

- **The starter box is the strongest evidence for what to cut, because WotC already cut
  it for exactly this audience.** Heroes of the Borderlands' class boards carry no
  Weapon Mastery, a short rest is a flat 4 HP with no Hit Dice, background bonuses are
  pre-baked, there is no XP and no character creation, and level 1→2 is a board flip.
  What the box *keeps* is Heroic Inspiration — as physical tokens, because handing one
  over "feels more momentous". That resolves §C's first two candidates in opposite
  directions: mastery waits, Inspiration stays (brief §5).
- **The one artefact every source agrees a beginner needs is per-character, not
  generic**: movement, the attack written as "roll d20 + 5, hit if ≥ AC, then 1d8 + 3",
  the character's *one* bonus action, the *one* reaction, and cantrips-vs-slots. That
  is a card at the top of the Play segment, and it is the same rows the walkthrough
  sheets already compute (brief §1).
- **Phones lose to paper on scrolling, not on lookup.** "Paper players were very quick"
  finding saves and slots while digital players scrolled; the win for digital is "click
  on a spell and see immediately what it does". So the sheet's job is to put attacks
  and slots in the first viewport and get out of the way, and the idle time between
  turns is the distraction risk, not the sheet (brief §6). §A.1 and §A.2 are the
  scrolling problem in its worst form: the thing to find is not there at all.
- **Session zero is where beginners' characters get made or fixed, together.** Every
  source says build at the table, write one page down, spend ten minutes on party
  connections, decide lethality out loud. Level 1 is "the danger zone": fewer monsters
  than characters, CR ≤ 1/4, +5–10 starting HP, level 2 within four hours (brief §2).
  The app has no session-zero surface and the encounter builder has no level-1 rails.
- **The DM's view of a character is Lazy DM step zero, and it is about the player.**
  Player name, what they want, what they are nervous about, hooks and NPC ties, "one
  question to ask next session", a spotlight tally — and tools that do this well give
  the DM a private layer on the character (Kanka's "Only me & Admins"). DMs editing
  sheets directly is the norm (76%) and the etiquette is transparency: ask the player
  to fix it first, and make an edit visible (brief §3).
- **Between sessions, the cheap things work**: five bullets, one highlight per player,
  two questions at the end of every night ("favourite moment", "what does your
  character want next"), a rotating player recap paid in Inspiration (brief §7). The
  recap surface exists; the questions and the per-player highlight do not.
- **The box needs almost no prep** ("maybe 10 minutes"), runs 30–90 minute scenes, and
  its known traps are sequencing, an Influence-action contradiction, incompatible
  milestone guidance across booklets, and starting kits with no rope or potions (brief
  §4). The DM's crib and the milestone column already answer two of the four.

## Decisions — Jamie, 2026-09-05

Twelve questions in three rounds, asked after the walkthrough and the research. Every
answer is Jamie's; the `first-table` epic's `breakdown.md` says how each shaped the
build order.

| Topic | Decision |
|---|---|
| One character per user | **UI only** — hide *New*, the list and the join picker; the API and the schema stay as they are. |
| Starting over | **Only the DM can retire a character**; the player is then sent into the wizard. The player-side delete goes when that ships. |
| The DM's front door | **Land on `/dm`, a two-stop bar (Library · DM)**; the create route refuses the `dm` role. |
| Profile view | **A DM-only page per character** — who plays it, readiness with one-tap fixes, DM-private notes, links to the live sheet, Edit and Manage level. The glance opens it. |
| Weapon Mastery | **A sixth gate, off by default**; the wizard pre-picks masteries from the kit silently so the choice exists when the gate opens. |
| Heroic Inspiration | **Keep it, ungated**, one line clearer; the DM can grant it from the profile view. |
| "Your turn" card | **Pinned at the top of Play.** |
| Inventory and Library defaults | **Both trimmed** — Attuned hidden until a magic item exists, packs folded; the Library opens search-first across all six types. |
| Session zero | **The Tutorial campaign is session zero — a campaign that starts and ends in one night.** The real campaign follows it. |
| The seven existing characters | **The DM fixes each from the profile view.** Nothing automatic. |
| Announcing the night | **Yes** — a reveal on the plan puts its date on the player campaign view. |
| Before Thursday | **The sheet fixes, the DM's door and the one-character rule, and the profile view with notes.** Everything else is P2. |

## Considered and not ticketed

- **A dice roller, offline data, social features, multiclassing** — all on the kill
  list; nothing here reopens them.
- **A "you're up" turn-aware mode** — declined on 2026-08-29 (walkthroughs only), and
  the research does not move it: the DM's voice is the turn prompt at a physical table.
- **Encoding the starter box** — D41 stands. The DM's own notes reference the book.
- **Real-time push** — D25's polling is enough at fifteen seconds for a room where
  everyone can also hear the DM say "you're level 2".
- **Self-healing sheets** (equip and seed slots on the next open) — offered, and Jamie
  chose the DM's hand instead: the readiness checklist fixes the seven, one tap each.
- **A unique index on `characters.owner_id`** — offered; Jamie chose UI-only. It stays
  available as a one-line additive migration whenever the rule should become a
  guarantee.
- **An attribution log for DM edits** — the research's etiquette ("make an edit
  visible"); D25 stands for now, noted on the profile stub as the thing to revisit if a
  player ever asks "who changed my hit points".
- **Two accounts on production that are not friends** — `cunha@example.com` and the
  DND-016 probe account. Both deletable from `/dm/users` today; not a ticket.
- **A character's name** — the table's business, not the app's.
- **`.icm/project.md`** is not amended here (it is `/project`'s); the next run should
  take D13's boundary (retire moves to the DM), the sixth gate, and the one-night
  tutorial into the register.
