# D&D 5e Companion — project register

> Last `/project` run: 2026-08-29 · commit `fc1af5e`
> Maintained by `/project`. Amend by re-running it, not by hand-editing during a session.

## What this is

A mobile-first D&D companion for Jamie and the friends at his physical table. Two halves
of one job — reference lookup and a live character sheet — now aimed at a third: getting
5–6 friends who are brand-new to D&D through character creation, learning the game, and
their first campaign, which Jamie DMs from a published starter box with a session date
weeks away. Personal project, personal scale — one table, no customers, no revenue.

## Intent

- **For whom** — Jamie (the one `dm`) and 5–6 friends who have never played D&D. Players
  remain the primary user; until the first campaign has run, "player" means "beginner".
- **The job** — **teaching is the job until the campaign runs** (D33): get six beginners
  creating real characters and understanding what their choices do in play. Once a
  session is underway, the old hierarchy resumes: the sheet wins, and nothing may make
  it fiddlier. The ten-second lookup bar stands throughout.
- **Done looks like** — *v1 (2026-08-13, shipped, never played):* a friend signs in,
  creates a character, runs a session off the sheet, looks anything up in under ten
  seconds. *v2 (2026-08-15, shipped):* Jamie runs a session from behind the screen.
  *v3 (agreed 2026-08-29):* each friend builds a 2024-rules character through the guided
  wizard on their phone, learns the game from the app, and Jamie preps the starter-box
  campaign in the DM suite and runs session 1 — reveals, tracker, table screen — at the
  physical table.
- **Explicitly not** — a product (no customers, pricing, growth). Not a VTT, not a dice
  roller (D8), not a general-purpose campaign manager — it is a campaign *companion* for
  this one table (narrowed 2026-08-29). No multiclassing (D15).

## Business logic

- **Everything requires a session** (D34). The public half is retired. Named exceptions:
  the token table screen `/table/[token]` (D24 — the token is the credential), `/auth/*`,
  `/offline` (the service worker must cache it signed-out), and the reference *data*
  endpoints (public + CDN-cached: SRD content, no personal data — an implementation
  detail, not a surface).
- **The wall carries where you were going**, as of `triage/sign-in-return-destination`.
  The campaign join link is what made this urgent: a DM sends `/campaigns/join/[code]` to
  someone who is by definition signed out, and the wall used to answer `307
  /auth/sign-in` flat, landing the player on their own character with the link gone.
  Neon Auth's middleware cannot carry a destination — `NeonAuthMiddlewareConfig` exposes
  `loginUrl` and nothing else, and all it copies onto that URL is the request's *query*,
  never its path — but `loginUrl` is read per instance, so `src/proxy.ts` builds one per
  request with the destination on it and the library still owns the session check and the
  redirect. `src/app/auth/[path]/page.tsx` reads it back and passes it to `AuthView` as an
  explicit prop. **The destination is only ever a path on this origin**, and that is the
  whole of `src/lib/auth/return-to.ts`: an open redirect here would be a phishing page
  wearing this app's URL, so a value naming any origin at all is refused and sign-in falls
  back to its default. The prop is passed on *every* render, never conditionally —
  `AuthView` reads `redirectTo` off `window.location` itself when it has no prop, so
  leaving it off for an unsafe value is what would open the hole. The exception list in
  `isPublicPath` is untouched.
- **A character belongs to its owner.** Owner-scoped queries; another user's character id
  404s rather than 403s. Preserved for players.
- **A DM sees and edits every character in a campaign they run**, including live combat
  state (D13). A player still sees only their own.
- **A character may belong to several campaigns** (join table, D14).
- **A DM's secrets never leave the DM.** Prep entities are revealable (D38): a public
  layer, a DM-only layer, and a `revealed_at` — player-facing queries select public
  columns only. Per-note visibility (D30) and private character notes stand.
- **Campaign content starts hidden; revealing is a deliberate DM act.** Revealed items
  persist in the players' discovered list and surface on the table screen.
- **Rules baseline is the 2024 rules — SRD 5.2.1** (D31). On screen the word is
  **species** (D32). Adventure text never enters app data; the DM's own prep notes
  reference the box he owns (D41).
- **Every rules lookup is answered from disk** as of `long-tail-reference-data`: 339
  spells, 331 monsters, 262 magic items and the 182-row equipment table ship in
  `src/lib/srd/data/` beside the creation sets, and no third party is in the request
  path. The split is bundle size, not trust — the creation-critical sets are imported
  straight into components, and only the long tail goes through the app's own public,
  CDN-cached `/api/srd/*` routes so a phone downloads a search result rather than a
  megabyte of stat blocks. The 2014 `/api/dnd5e/*` namespace is **retired whole**, per
  D31: a new path can never serve one player 2014 Fireball and the next 2024 Fireball
  from the same 8-day CDN window.
- **The derived-stat engine is on the 2024 mechanics** as of `rules-engine-2024`:
  every class takes its subclass at **level 3**; **Exhaustion** is a flat −2 to every
  D20 Test and −5 ft of Speed per level, folded into the saves, skills, initiative,
  passive Perception and attack bonuses the sheet prints; **weapon mastery** is
  surfaced per equipped weapon, named even for a class that cannot use it; half
  casters (paladin, ranger) cast from **level 1**; and **"spells known" is gone** —
  every caster prepares, from a count the class table fixes by level rather than from
  an ability modifier, with the wizard's spellbook the only list still picked at
  creation and level-up. The tables the SRD publishes only in the class Features
  tables are transcribed locally in `src/lib/characters/rules.ts` — upstream's
  `/api/2024/classes/{index}/levels` is a 404, so there is nothing to proxy.
- **A character records its 2024 origin** as of `character-model-migration`: the
  background it came from and how that background's +2/+1 was spent, the Origin feat,
  the subclass taken at 3rd level, the weapons it has Weapon Mastery with, and whether
  it is holding Heroic Inspiration. All seven columns are nullable — the production
  migrate job runs in parallel with the Vercel deploy, so every schema change has to be
  additive, and nullable is the shape this one took. The six ability score columns keep
  holding the character's *final* scores as entered, so a background's increases are
  recorded rather than re-applied; the flow that starts from base scores is
  `guided-creation`. The 2014 prototype characters are deleted outright (D42) — no
  legacy mode, no conversion, no backfill — by one-off SQL Jamie runs against
  production, not by the migration, which would otherwise fire on every fresh
  environment.
- **A level-up asks what the level gives** as of `asi-and-feats`: at 4th, 8th, 12th,
  16th and 19th — plus 6th and 14th for a Fighter and 10th for a Rogue — the level
  planner prompts for the Ability Score Improvement, pre-filled from the class's primary
  ability (+2 to it, or +1 to each of two for a class the SRD names two for), with the
  SRD's General feats and, at 19th, the Epic Boons behind an advanced toggle. Nothing
  passes **20**. In the 2024 rules the improvement *is* a feat, so both branches store as
  one `feat_choices` entry per level — the feat's index and the points it actually added
  — in a nullable jsonb column, additive like the rest of the 2024 build. That ledger is
  what makes levelling *down* exact where hit points can only be approximated: the
  increase that was applied is on record, so it is the increase that comes back off, and
  a character with no ledger (every row written before this) has nothing taken away. All
  seventeen SRD feats now ship in `src/lib/srd/data/feats.json`; Origin feats are the
  same four a background grants, and Fighting Style feats are a class feature's to give,
  so neither is ever offered at a feat level.
- **A first character is made in a wizard, not a form** as of `wizard-frame`:
  `/characters/new` is eight steps — class, species, background, ability scores, skills,
  starting gear, spells, name — **mechanics before flavour**, with the recommendation
  pre-selected on every one and "use every suggestion" jumping straight to the name.
  Level 1 only; the one-page form stays as `/characters/[id]/edit`, which is where a
  build copied off paper belongs. The wizard is the one place scores are entered as a
  *base*, so `abilityScoresWithBackground` finally has its call site and a background's
  +2/+1 is applied exactly once; hit points, speed and the unarmoured armour class are
  derived rather than typed, and the starting kit lands in the inventory with armour
  already worn, so the sheet's own derived AC is right the first time it opens. The
  draft lives in `localStorage`, not in a row — an unfinished character is not a
  character, and a row for one would surface in every owner-scoped query in the app.
  **The join → create → attach loop is closed** (D36): a wizard started from a campaign
  join, or by a member of exactly one campaign, attaches the finished character to that
  campaign, and a player who joins with no characters is taken into the wizard rather
  than to an empty list. `POST /api/characters` grew four optional creation-only fields
  for it; membership and the equipment clause are both re-derived server-side, so the
  campaign id in a body is a pointer and never a permission.
- **The quiz decides the class; the class decides the rest** as of `vibe-quiz`. The
  wizard's optional first screen is four plain-language questions — what you want to be
  doing when trouble starts, how much you want to keep track of, your job in the group,
  where your edge comes from — and `src/lib/characters/vibe-quiz.ts` maps the answers to
  a whole character: class, species, background, where the standard array goes, skills
  and spells, with one "why this fits" line written per row of the table. It is a
  **table, not a score**: an ordered list of rules, first match wins, because a
  recommendation somebody disagrees with has to be one you can point at a line of. All
  ninety-six answer combinations are unit-tested, and every one of the twelve SRD
  classes is reachable by some path. Every "keep it simple" answer lands on Champion
  Fighter or Thief Rogue (research §3 — the lowest cognitive load in the game), except
  where the player has just asked for spells: SRD 5.2.1 has exactly one class per source
  of magic, so there the flavour answer decides and the copy says so. Skippable from
  every screen and re-runnable from the class step, and the draft carries the answers so
  a re-run opens on them; skipping or abandoning a re-run changes nothing. The quiz adds
  exactly one thing downstream of the class — the skills, re-ranked on what was answered,
  which the research names among the few choices that change moment-to-moment play.
- **Every option says what it means in play** as of `inline-consequences`. Each of the
  twelve classes, nine species, four backgrounds, eighteen skills, six ability scores,
  four weapon groups and the whole curated spell hand carries a one-line plain-language
  note under its name — what you actually *do* with it at the table, not what the rule
  says. The copy is authored in `src/lib/srd/in-play.ts`, beside the SRD data and keyed
  by SRD index but written fresh in the app's own words (mechanics are not
  copyrightable, phrasing is), and it is the **only** hand-written module in that folder
  — everything else there is generated. `in-play.test.ts` is a lint pass rather than a
  unit test: every published index must have a line and every line must have a published
  index, so an option added without one fails CI instead of shipping a half-blank card.
  One component renders all of it — `option-row.tsx`, shared by the radio steps, the
  spell checklists and the full skill picker — because the sentence has to look the same
  under a class as it does under a cantrip or the sentence reads as decoration. Two
  deliberate stops: a starting-gear bundle is parsed out of SRD prose, so its line is
  *composed* from the weapon group it hands you rather than authored per bundle, and a
  spell outside the curated hand gets no line at all — annotating all 339 would be the
  wall the wizard exists to take down.
- **The DM's NPC roster is the revealable pattern's first table**, as of
  `dm-prep-suite/npc-roster`. `campaign_npcs` carries a public layer (name, one line,
  description), a DM-only layer (motivation, secrets, the turn, a stat block to run them
  as, freeform notes) and a nullable `revealed_at` — no default, so a new NPC is hidden
  because nothing said otherwise. The three shared columns are declared once
  (`revealableColumns()` in `src/lib/db/schema.ts`) and the authority and reveal
  predicates once more (`src/lib/db/revealable.ts`), so `locations-handouts` and
  `session-plans` inherit the rule rather than re-deriving it. The split is enforced two
  ways: `npcPublicColumns` is the only selection a player-facing read may name — and its
  type has no DM-only field on it — while `NPC_PUBLIC_FIELDS`/`NPC_SECRET_FIELDS` in
  `src/lib/npcs/schema.ts` are what the editor renders from, so a field is marked secret
  on screen because it *is* secret, not because someone put it below the divider. **No
  player surface, and nothing here can reveal**: `revealedAt` is absent from both zod
  schemas, so neither the UI nor a hand-rolled request at the endpoint can stamp it. The
  roster says "Hidden" and means it until `dm-run-suite/reveal-controls` ships the act.
  No image column — `locations-handouts` owns the storage decision for the whole suite.
- **The DM preps places and handouts too, and the app now holds images**, as of
  `dm-prep-suite/locations-handouts`. `campaign_locations` (what the party sees on
  arrival | what is really there) and `campaign_handouts` (the artefact — a title, its
  text, its picture | what it really is, when to produce it) are the second and third
  revealable entities, built from `revealableColumns()` and `revealable.ts` rather than
  re-derived, each with its own `*_PUBLIC_FIELDS`/`*_SECRET_FIELDS` pair. Both reach the
  DM at `/dm/campaigns/[id]/…` off the Prep card. Neither has a player surface and
  neither can reveal, exactly as the roster does not.
- **Image storage is Vercel Blob, and every object is private** (same ticket). The
  platform the app already deploys to, so it is one environment variable
  (`BLOB_READ_WRITE_TOKEN`, which has to be set in Vercel) rather than a second vendor —
  Postgres `bytea`, S3/R2 and an upload SaaS were the alternatives, and the reasoning
  against each is written out in `src/lib/images/store.ts`. The rails are the ones the
  epic's data lens set: **blob first, row second** (a failure leaves an orphaned object,
  never a handout whose picture 404s at the table), the format decided from the file's
  own **magic bytes** and never from `file.type`, **no SVG** in the allowlist, **upload
  only** — there is no import-from-URL anywhere, because that is the SSRF door — and
  4 MB, under Vercel's request-body limit and a size a phone can actually send. Objects
  are written `access: 'private'`, so **no URL serves them**: the store key never leaves
  the data layer (every read redacts it to size, type and date), and the bytes come back
  only through an authed route that asks who is signed in and whether they run the
  campaign. Handouts, NPC portraits and the new nullable `characters.portrait` all use
  it; the character column is added for `dm-run-suite/player-campaign-view` and nothing
  writes it yet.
- **Players have a campaign screen, and it can only ever show what was revealed**, as of
  `dm-run-suite/player-campaign-view`. `/campaigns/[id]` is member-only and read-only:
  the party (name, species and class, level, face), then the people met, the places found
  and the handouts received. Reveals now have somewhere to land, which is what
  `dm-run-suite/reveal-controls` needed before it could ship the act — nothing sets
  `revealed_at` yet, so every discovered list is empty today and the page says so once
  rather than three times. **Not a tab and not the home screen**: Jamie chose
  character-first, so the only entrance is a card at the foot of the sheet of a character
  that is actually on the campaign, beside DND-058's shared notes. The leak-proofing is
  three arms carried together on every statement in `src/lib/db/discovered.ts` —
  membership (`seatedAt`, a new EXISTS over `campaign_members` beside `runByDm`, and
  never the roster's `role`, which grants nothing), `revealedOnly`, and a named
  public-column selection — none of them an application-side filter, so a row a player
  may not see is one the query never selected and a DM-only field is not on the type to
  leak. A mutation of any single arm fails the tests. Two member-scoped GET-only image
  routes serve the private blobs (a revealed handout's picture, a party member's
  portrait — the first reader of `characters.portrait`); handouts reach the browser
  carrying the image's upload timestamp and nothing else, so the store key still never
  leaves the data layer. The recap the stub also asked for waits on
  `dm-run-suite/session-log-recap`.
- **The DM's reveal switch is what puts prep in front of the party**, as of
  `dm-run-suite/reveal-controls` — the act D38 named and nothing wrote until now. Every
  NPC, place and handout carries one control on the DM's screen: **one tap, no
  confirmation dialog, and the consequence written beside it** ("Revealing shows their
  name, your one-line summary, the description and the portrait"), because this is
  pressed mid-sentence with players a foot away and a dialog is where that sentence would
  go to be dismissed unread. **Un-revealing is the same switch**, not a repair path — the
  misclick this feature will actually make is revealing the wrong NPC in the wrong scene,
  and `revealStamp(false)` clears the timestamp, which for a handout also puts the
  picture back behind the check that serves its bytes. Revealing has **its own endpoint**
  (`PUT …/reveal`, body `{revealed}`) rather than a field on each entity's PATCH: an edit
  changes prep only the DM reads, a reveal puts content on five phones, and two acts with
  different consequences do not share a request shape. Reveals land on **two player
  surfaces within a poll**: the campaign view's three lists are now newest-first (the
  thing just revealed is at the top, not filed alphabetically) and re-render on the 15 s
  player rail via `router.refresh()` rather than a fourth JSON endpoint — the page has no
  client-side data, so there is nothing new to leak from; and the public table screen
  features a **"just revealed" card beside the initiative order**, in the second column
  of a two-column layout so a table of six players loses no rows to it. That card is the
  narrowest projection in the app — a kind, a name, and a one-line summary where the DM
  wrote one, never a description, a handout's body or a picture — built inside
  `getEncounterByShareToken`, so what a share token buys stays reviewable by reading one
  function. It is a **moment, not a state**: reveals older than 15 minutes stop being
  featured, and the party's own phones keep everything.
- **What happened at the table is a query, and the recap is the DM's own words**, as of
  `dm-run-suite/session-log-recap`. The session log is a **derived view, not a written
  table** (D41): a fight ending, an NPC, a place or a handout being revealed and a scene
  or secret being ticked off already stamp five columns, and a sixth copy written beside
  them on a driver with no transactions is the shape that eventually disagrees with
  itself. So `getSessionLog` reads those five stamps and merges them, oldest first, and
  the only new columns are **two nullable timestamps**: `encounters.completed_at` and
  `campaign_notes.session_closed_at`. **Ending a fight is now an act of its own** (`PUT
  …/complete`, body `{completed}`) — until now the only control that said a fight was
  over was Delete, which cascades the combatants away and takes the fact that it happened
  with them; ending keeps the order, the monsters and their hit points, and reopening is
  the same button. **The close-session step is one act with two halves**: what the DM
  edited publishes to the party *and* the log's window moves, because a closed session
  with nothing to show for it and a recap that leaves tonight's fights in tomorrow's log
  are both states worth not having. `session_closed_at` settles three questions with one
  stamp — which shared note is a recap, where the next log starts, and that a quick
  capture never lands in something the party is already reading. The draft is **facts
  first, the DM's captured lines under them, and every word of it editable**: the app
  remembers, the DM writes, and a draft that tried to be the recap would be one the DM
  has to unwrite. Publishing **never overwrites the note the captures went into** — a DM
  who trims too hard keeps the raw evening. Players get the recap at the **top of their
  campaign view**, above the party, and get *recaps only*: `listCampaignRecaps` carries
  three arms — seated at the table, shared by the DM, and closed — so a working note
  cannot appear there even by id.
- **Tapping a monster in the tracker opens its stat block over the fight**, as of
  `dm-run-suite/tracker-stat-blocks`. The tracker already opened *something* on a monster
  row — the Library's own `MonsterDetail` in the shared reference sheet. That is a
  reference browser and reads like one: badges, a seven-cell grid of everything the SRD
  prints, and Traits filed above Actions because that is the book's order. Mid-fight with
  initiative waiting, the DM asks a different set of questions in a different order, so
  the tracker now has **its own view** (`monster-stat-block.tsx`) and the Library keeps
  the one it had. Three headline numbers lead — **AC** (with what it comes from), **HP**
  (with the hit-dice formula, so a DM who prefers to roll it can) and **Speed** (the
  leading mode large, every other mode underneath) — then the six abilities, each cell
  carrying its **saving throw where the creature is proficient** rather than repeating
  the six of them in a separate row, then **Actions above Traits**, the reverse of the
  book. Each action lifts the numbers about to be rolled into chips above the SRD
  sentence: `+4 to hit`, `reach 5 ft.`, `5 (1d6 + 2) Slashing`, or a breath weapon's
  `DC 21 Dex`. That parse (`monsterActionNumbers` in `src/lib/srd/format.ts`) **never
  removes text** — the SRD sentence is always printed whole underneath, so a line it
  cannot read (a Multiattack, a spellcasting block) costs its chips and nothing else.
  It reads all 423 attack lines and all 160 save lines in the shipped data, and a test
  asserts exactly that against the corpus, so a regeneration that re-words the opening
  clause fails CI rather than quietly blanking every chip. **No player surface**: this
  is DM-only by the screen it lives on, and the public table screen is untouched — D24's
  spirit is that players do not even see monster HP, let alone what the thing hits for.
- **An encounter is now priced before it is saved**, as of
  `dm-prep-suite/encounter-builder`. Encounters used to be a name field: type "Ambush at
  the bridge", land on the tracker, and find out at the table whether four goblins was a
  scene or a funeral. That field is gone; `/dm/campaigns/[id]/encounters/new` asks for the
  name, the monsters and **who is turning up**, and prices the fight on every tap. The
  arithmetic is the **2024 method and nothing else** — each attending character's XP
  budget from the SRD 5.2.1 table, summed, against the monsters' listed XP, with **no
  multiplier table**: the ×1.5-for-four and ×2-for-eight rows are gone from the rules and
  are not reimplemented here. `src/lib/encounters/budget.ts` is pure and unit-tested
  against `docs/rules/10-dm-guide.md`'s own worked example, and the numbers are
  transcribed from that file rather than derived from a monster's CR.
  **Attendance is a toggle, not the roster** — a 5–6 player table rarely arrives whole,
  and a budget computed for six when four show up is the exact reading that gets somebody
  killed; the same ticks decide who is seeded into the encounter as a PC row, because
  "who is fighting" and "who the fight is measured against" are one set and asking twice
  is a way to get two answers. Past the High budget the readout **warns and never
  blocks** — it says how many XP past, in words, because a DM who means to run a deadly
  fight is allowed to and the one thing they must not be is surprised. Two states the
  rules do not name are named anyway: "No monsters yet" and "Under Low" are different
  things to tell a DM, and with nobody ticked the readout **withholds a verdict** rather
  than printing a band computed against a budget of zero. **The tracker is untouched** —
  `src/lib/encounters/tracker.ts` has not a line changed. The builder feeds it: the
  create route now takes an optional party and monster lines and seeds them through the
  same DM-scoped `addCharacterCombatants` / `addMonsterCombatants` the Add-combatants
  sheet uses, party first so the PCs head the pre-initiative order, sequentially because
  each add reads the encounter to number the next goblin. `budget.ts` sits beside
  `experience.ts` rather than inside it: one prices a fight being assembled, the other
  one that has been fought, and their shapes (a line of four goblins, four goblin rows)
  are not the same shape.
- **Tapping a number on the sheet explains it**, as of `learn-to-play/roll-walkthroughs`
  — the epic's last stub and, per the research, its highest-value one. An attack row, a
  skill, a saving throw and a spell each open a bottom sheet laid out as the four steps
  of a roll: **pick up** (the d20 — or, on a spell that forces a save, the fact that the
  caster picks up *nothing*, which is the thing beginners get wrong), **add** (every
  line of the modifier with the reason it is there — "Finesse, so the sheet took your
  better score", "expertise doubles it", "your class is not proficient in this save"),
  **beat** (their AC, the DM's DC, your spell save DC — printed as `?` where the DM
  holds the number rather than as a number the sheet cannot know), and **then** (the
  damage dice, what a natural 20 changes, the slot to mark off, what concentration
  costs). **Every number is taken from the rules engine in `src/lib/characters/`, never
  recomputed** — `walkthrough.ts` calls `weaponAttack`, `unarmedStrike`,
  `spellAttackBonus`, `spellSaveDc`, `skillChecks`, `savingThrows` and
  `skillProficiency`, and its tests hold each breakdown to summing back to the engine's
  own answer, so a future change to a formula cannot leave the explanation teaching
  arithmetic that misses the number printed beside it. Two engine gaps were closed to
  make that true rather than nearly true: `unarmedStrike` (the sheet had been deriving
  `1 + Strength` inline) and `skillProficiency`, which now returns *why* a check gets
  its proficiency — expertise, proficiency, Jack of All Trades or nothing — with
  `skillChecks` reading the same ladder. **D8 holds throughout: nothing rolls anything.**
  The spell walkthrough lives inside the cast flow rather than in a layer of its own,
  because it describes the slot spend and the concentration that sheet performs, and it
  recomputes for whichever slot level is selected; cantrips now open that flow too.
- **The app sends a Content-Security-Policy** (same ticket) — added at the moment it
  first renders a file a user uploaded. `object-src 'none'`, `frame-ancestors 'none'`,
  `base-uri` and `form-action` held to this origin, images to `'self' data: blob:`, and
  connections to this origin plus the exact Sentry ingest host the DSN names. Scripts and
  styles still carry `'unsafe-inline'`, because Next's App Router inlines both and the
  supported fix is a per-request nonce — a ticket of its own, noted in
  `src/lib/security/csp.ts`.
- **The four numbers a beginner cannot know are worked out, not asked for** as of
  `derived-defaults`. Hit points, armour class, speed, the starting kit and the starting
  spells are all outputs of the seven choices above them, and `derivedDefaults` in
  `src/lib/characters/wizard.ts` is the single place they are settled. Nothing is
  restated: the hit die and Unarmored Defense come from the 2024 rules engine
  (`unarmoredArmorClass`, `speciesHitPointBonus` in `rules.ts`), and the armour class
  the last step *promises* is the sheet's own `derivedArmorClass` run over the gear that
  is about to be worn — the same function, the same armour, one screen earlier, so the
  wizard and the first sheet render cannot disagree. The gear step shows the number move
  as the kit is swapped. Two rules the engine gained rather than the wizard: a
  barbarian's and a monk's Unarmored Defense now reach the stored `armorClass` column,
  which is what a 1st-level monk's 15 is made of, and Dwarven Toughness's hit point a
  level is added at creation *and* by the level planner, so a dwarf keeps it past level
  1. Manual entry survives behind the Advanced toggle on the last step — three fields,
  each independently overridable, for a character copied off paper; leave one empty and
  it goes back to being derived. The armour class field says out loud that worn armour
  still beats it, because it does, and the summary names what produced the number it is
  showing rather than what was typed. Every class × species combination is unit-tested,
  and every one of the twelve classes is held to the armour class its own starting kit
  produces.
- **A character being made for a campaign hears one gentle word about the party** as of
  `party-balance-hints`, and only then. `/characters/new` already knew which table a
  character is for (the join link's `?campaign=`, or the player's one campaign); it now
  also reads that roster's classes — `listPartyClassIndexes` in
  `src/lib/db/campaigns.ts`, the one roster read that is not DM-scoped, membership
  folded into the join, and class indexes are all it returns. `partyHint` in
  `src/lib/characters/party-balance.ts` turns them into **at most one** line on the class
  step, from an ordered table of rules, first match wins — the same shape the vibe quiz
  uses, so every nudge is a line somebody can be shown. Four roles a beginner party
  notices the absence of (heal, front line, scout, spells), authored per class with the
  caster role held to the rules engine's own `spellcastingAbility`. It is informational
  and nothing else: it never blocks, it never calls a duplicate class a mistake, a gap
  the player has just filled stops being mentioned, and one "Got it" silences it for the
  rest of the build. Outside a campaign, or at a table of one, it says nothing at all.
  Two rules of the table are held by tests rather than by care: every rule must be
  reachable (roles contain one another — every class that heals also casts — so two
  early drafts were unreachable rules that read fine), and no line may contain the words
  a requirement is written in.
- **A brand-new character is met, once, by one band on their own sheet** as of
  `triage/creation-completion-learn-link`. The wizard still pushes straight to
  `/characters/<id>` — no completion screen between the two, because the last tap of
  twenty minutes should land on the character rather than on a page about them — so the
  wizard leaves the sheet a note and the sheet claims it: a band naming the character,
  saying the sheet is the player's now, and offering `/learn` at the one moment somebody
  is likeliest to read six pages about how to play. The note is a single `localStorage`
  slot (`markCharacterWelcome`/`claimCharacterWelcome` in
  `src/lib/characters/welcome-flag.ts`), written only by the create path and removed the
  moment it is claimed — a *hand-off*, not a set of characters already welcomed, which
  would grow unprunably and would greet every character an existing player already owns
  as freshly made. No column and no migration: the band is one line seen once, the
  device that pushed to the sheet is by construction the device that made the character,
  and a `welcomed_at` write would sit on the read path of the page opened mid-combat.
  Everything absent means silence — no storage, private mode, a second device, a DM
  opening a party member's sheet, a character made last month.
- **The DM has a crib, and it is data rather than prose**, as of
  `dm-run-suite/dm-rules-crib`. `/dm/crib` is the paper DM screen digitised: seven stops
  — a method for a player trying something you have no rule for, the turn budget and the
  actions, all fifteen conditions, what to do when somebody hits 0, cover and light, pace
  and rests, and the arguments a first table actually has. `/rules/quick-reference`
  already held most of the same rulings and is no use with six people waiting, because
  reading a rendered markdown chapter means scrolling paragraphs for one number. So the
  crib holds them as **rows in `src/lib/dm/crib.ts`** — a label, an answer, and an
  optional glossary index — rendered as tables, numbered steps, a DC ladder of tiles and
  short notes. **Grouped by the moment at the table, never by rulebook chapter**: cover
  sits with light and darkvision because "can they even see it" is one question asked
  once. **No search box** — typing loses to scrolling at this length, and a search field
  on a phone opens a keyboard over the answer — and nothing is collapsed, so the jump
  chips are only a shortcut past the scroll. Every line is **written fresh on the 2024
  baseline**, the same rule `glossary/terms.ts` and `srd/in-play.ts` keep: the SRD's own
  wording stays in `/rules` with its attribution, and a test holds every row to 160
  characters, to never opening with its own label, and to every glossary index resolving
  — a dead popover fails soft and would say nothing on screen. Two ways in, both one tap:
  a card on the DM tab, and a **Crib** button in the encounter's page header — in the
  header rather than beside "Next turn", which is pressed forty times an evening. It is a
  page, not a sheet over the tracker: seven stops is a page with the fight hidden behind
  it, and the encounter's state is the server's, so leaving costs nothing. DM-gated the
  way `/dm` is (D19) — a player who follows a link is told whose screen it is and pointed
  at `/rules`, not 404ed.
- **The party levels by milestone** (D35), shipped as one nullable
  `campaigns.milestone_level`. The DM calls a level on the campaign screen — one button,
  one write, one column — and every character below it derives a band at the head of its
  sheet offering the DND-032 planner. **Nothing is fanned out and nothing is stored per
  character**: `neon-http` has no transactions, so a six-character loop can half-apply,
  and "a level is waiting" is the comparison `characters.level < campaigns.milestone_level`
  asked at render time. The app still levels nobody up — the planner does, one level at a
  time, at each player's own pace. The DM's card counts who has taken it, off the party
  glance's own poll. Two tables means the higher milestone, for the gates' union reason.
  XP retires behind the fifth gate, off by default: the sheet's XP card and the encounter
  tracker's award step are gone from the default experience, `experience.ts` and the
  `experience` column are untouched underneath, and a table that wants XP back gets it
  with a tap.
- **Feature gates per campaign, defaults off** (D40) — gates hide UI, never delete
  state; the app grows as the group learns. Shipped as one nullable `campaigns.gates`
  jsonb column (`NULL` is every gate off) over five switches: spell preparation,
  conditions & exhaustion, coins, class resources, experience points. The DM sets them at
  `/dm/campaigns/[id]/settings`, one line each saying what turning it on adds for the
  players. A gate hides a card and writes no character column — exhaustion still moves
  every d20 test, a rest still refills a hidden pool — and every read fails towards more
  surface: a character in no campaign sees everything, and one at two tables sees the
  union of what its DMs switched on. The coins gate covers the purse only; encumbrance
  does not exist to gate.
- **The turn control sits under the thumb, and removing a combatant asks first**, as of
  `dm-run-suite/tracker-ergonomics`. "Next turn" is the most-tapped control of the
  evening and it lived in the tracker's header, a full scroll away by the second round of
  a ten-combatant fight; it is now a strip carrying the round and the button, cleared by
  `--bottom-nav-height` the way every other pinned control is (DND-029). **Sticky rather
  than fixed**, so it pins over the initiative order it belongs to and hands the bottom of
  the screen back to the quick note, end-fight and share cards below it — no page padding
  and no overlay. Advancing also **scrolls the newly active row into view**, centred so
  the strip cannot cover it, and *only* an advance does: a poll or a damage tap moving the
  page would pull the list out from under the thumb aiming at it. The per-row ✕ now goes
  through the same confirmation deleting the encounter does — it shares an edge with the
  damage buttons pressed all evening, and the DELETE behind it takes a rolled initiative
  and a monster's remaining hit points with it. A **confirm, not an undo toast**: the
  combatants POST mints fresh rows with seeded HP and no initiative, so there is nothing
  an undo could put back.
- **A finished character can attack, cast and master from the first tap** as of
  `first-table/creation-readiness`. The walkthrough of production on 2026-09-05 found
  all seven Tutorial characters with no weapon equipped, five of six casters with no
  spell slots, and nobody with a Weapon Mastery choice: the wizard had put the kit in
  the backpack and stopped. The three "ready a character" rules now live **once**, in
  `src/lib/characters/readiness.ts`, as pure functions over a character's items and
  class — which weapons to ready (one melee, plus one ranged where the kit has one; the
  character's better ability decides, a two-handed weapon is never paired with a worn
  shield, and a kit with no bow readies its javelins), the standard slot table for every
  level-1 caster (paladin and ranger included, the warlock's pact slots as its table
  gives them), and up to the class's count of masteries picked from the kit with the
  readied weapons first — and `POST /api/characters` calls all three inside the wizard
  path, so a one-page body still produces the insert it always did. The DM's profile
  fixes call the same three. The Attacks card's empty state names what is in the pack
  and where the switch is.
- **The party glance prints the AC the sheet prints** as of
  `first-table/glance-derived-ac`. The roster read carries each character's worn
  armour (one more statement over `character_items`, resolved through the local SRD
  table), and the glance and the characters list compute AC through the sheet's own
  `derivedArmorClass` — never a second formula, and nothing stored. On production the
  glance said 10 for a paladin whose sheet said 18.
- **The DM lands behind the screen, and a player is their character** as of
  `first-table/dm-front-door` and `first-table/one-character`. `/` sends the `dm` role
  to `/dm` (the role is read once per request — `getUserRole` is `cache()`d like the
  session); the DM's bar is **Library · DM**, a player's **Character · Library**, two
  stops each (D16); `/characters` and `/characters/new` send the DM to `/dm` and a
  player who owns a character to its sheet; `POST /api/characters` answers 403 for the
  `dm` role; the join link brings the one character without a picker and lands on its
  sheet, and the DM following his own link lands on the campaign. The rule is **UI-only**
  (Jamie): the model and the API still allow a second character, which the retire flow
  needs, and a player who somehow owns two still gets the list. A DM reading a party
  member's sheet has the campaign as the way back, carried on the profile's link.
- **Weapon Mastery waits behind a sixth gate** as of `first-table/weapon-mastery-gate`:
  `weaponMastery`, off by default, no migration. Off hides the mastery line on the attack
  rows and in the walkthrough, the row on the Me segment's origin card, and the picker on
  the edit form (which now reads the gates); the weapons chosen stay chosen (D40). The
  attack engine now honours the recorded choice — a weapon the character did not choose
  says so rather than claiming the property — while a row with no choice recorded reads
  as the class alone, so nothing made before this changes.
- **The DM has a page for each player character, and a note on them nobody else
  reads** as of `first-table/dm-character-profile`, `dm-character-notes` and
  `retire-a-character`. `/dm/campaigns/[id]/party/[characterId]` is scoped by the same
  two arms as the roster — the campaign is the DM's and the character is on it — and
  shows who plays them (`neon_auth.user.name`, read once on this page rather than on
  every glance poll), the readiness checklist with a one-tap fix per line calling the
  readiness rules (items first with no version, then the row with the version the page
  rendered; a 409 refreshes and says so), the sheet's own numbers, an Inspiration
  toggle through the sheet's combat-state path, and the note. `character_dm_notes` is
  keyed by the character (Jamie, 2026-09-05) — the pair of `character_notes` with the
  readers reversed — and every statement that touches it carries the DM predicate
  through the roster, never `campaign_members.role`; the owner has no route to it (D38).
  A new note opens on four headings as text — *The player*, *Hooks*, *Ask next
  session*, *Threads*. **Only the DM retires a character**: `deleteCharacter` takes the
  viewer predicate now (the one place D13's boundary moved), the retire control is on
  the profile behind a confirm, the cascade takes items, notes and roster rows, the
  player's seat survives so their front door is the wizard again, and the player's own
  Delete card is gone.
- **The turn sits at the top of the sheet** as of `first-table/your-turn-card`: move,
  each readied weapon written the way the DM says it ("roll d20 + 5, hit if it beats
  their AC, then 1d8+3 slashing"), the bonus action and the reaction, cantrips and slots
  left. Every attack line is the walkthrough's own row read back as a sentence and taps
  open that walkthrough; bonus actions and reactions are read from the SRD's own text
  (`src/lib/characters/turn.ts`, pinned per class by test); slots and speed come from
  the live combat state. D8 holds.
- **Two questions at the end of the night** as of
  `first-table/between-sessions-questions`: the close-session step carries a row per
  character — favourite moment, what they want next, a highlight — and the answers land
  dated under *Threads* in that character's DM note, **notes first, then the recap**,
  the append idempotent by content so a re-pressed close is harmless; the highlights are
  offered to the recap as lines the DM keeps or deletes.
- **The encounter builder knows level 1 is the danger zone** as of
  `first-table/level-one-rails`: when everyone attending is level 1 or 2, one plain line
  each for more monsters than characters, any monster above CR 1/4, and any attack
  averaging more than 5 damage (read through `monsterActionNumbers`) — words, never a
  block; and the crib's 0 HP stop says to get them to level 2 inside four hours.
- **The inventory is a level-1 backpack, not a ledger** as of
  `first-table/inventory-trim`: the Attuned toggle appears only once the inventory holds
  a magic item (a row already attuned, an index in the magic-items list that is not
  mundane equipment, or a custom row named after one), and a pack folds into one row
  with a count and a disclosure. Equipped stays on every weapon and armour row.
- **The Library opens on a question** as of `first-table/library-search-first`: the
  search box alone, a search across all six types grouped by type with a count per
  group, the type chips as filters, the rules chips as before; one matcher
  (`src/components/reference/reference-search.tsx`) shared with the bar's lookup
  overlay, which keeps its flat list of 24.
- **Heroic Inspiration says what it is** as of `first-table/heroic-inspiration-line`:
  one line in the app's words above the SRD's, and the idle button reads "Mark it
  received". Ungated (Jamie).
- **Nothing derived is stored.** Spell slot maxima remain the deliberate exception;
  `campaigns.milestone_level` is stored state, with "level-up waiting" derived from it.

## Features

| Feature | State | Tickets |
|---|---|---|
| Fast reference lookup — six types, ten-second bar, magic items | shipped | redesign → `apple-redesign/home-and-library` |
| Accounts, protected routes, invite-gated fail-closed sign-up | shipped | wall → `apple-redesign/sign-in-wall` |
| Character creation — vibe quiz into a guided eight-step wizard, campaign-aware, with party-composition hints; one-page form kept for editing | shipped | — |
| Character sheet — combat core, skills, rests, attacks, inventory, spell prep, cast flow, concentration, level-up, four segments + beginner mode | shipped | — |
| Campaigns, membership, roles, party glance, encounters + initiative, session/campaign/private notes | shipped | — |
| Milestone levelling — the DM calls a level, sheets derive the prompt | shipped | — |
| XP tracking | shipped, off | behind the `experiencePoints` gate since D35 — the code and the column stay |
| Rules prose in-app — 11 chapters | shipped | 2024 rewrite → `srd-2024-migration/rules-chapters-2024` |
| Installable PWA, online-only (D28) | shipped | — |
| 2024 rules foundation — SRD 5.2.1 data, rules engine, character model, chapters, ASI/feats, long-tail reference data | shipped | `srd-2024-migration/` (6 of 6 done) |
| Apple HIG redesign — tokens, shell, front door, sign-in wall, segmented sheet | shipped | `apple-redesign/` (5 of 5 done) |
| Guided character creation — wizard, vibe quiz, consequences, derived defaults, balance hints | shipped | `guided-creation/` (5 of 5 done) |
| Learn-to-play layer — glossary, learn chapters, roll walkthroughs | shipped | `learn-to-play/` (3 of 3 done) |
| DM prep suite — NPCs, locations & handouts, session plans, encounter builder, feature gates | shipped | `dm-prep-suite/` (5 of 5 done) |
| DM run suite — player campaign view, reveals, stat blocks, rules crib, log/recap, milestone, table-screen legibility, tracker ergonomics | in progress | `dm-run-suite/` (6 of 8 done) |
| First table — ready characters, the DM's door, one character per player, the profile with notes, the sixth gate, the turn card, announced nights, retire, the one-night campaign, session zero, level-1 rails, the trims | shipped | `first-table/` (17 of 17 done) |
| Dice roller | out | killed 2026-08-13 (D8) — physical dice are the point |
| Offline data / sync / IndexedDB | out | retired 2026-08-13 (D2); D28 did not revive it |
| Onboarding/tutorials as BRD KPI noise | out | the 2026-08-13 kill is superseded by D33 — teaching returns as `learn-to-play/`, aimed at this table, not at KPIs |
| Social/community features | out | killed 2026-08-13 — one table |
| Multiclassing | out | D15 stands |

## Constraints

- **Technical** — Next.js 16 (App Router, Turbopack), React 19, Neon Postgres + Drizzle
  over `neon-http` (**no transactions — partial writes are the failure mode**; multi-step
  writes are ordered to fail benignly, or derived by query), Neon Auth pinned
  `0.5.0-beta` (D26), shadcn/Radix + Tailwind v4, Vercel. SRD 5.2.1 content ships as
  local JSON data modules (D31) — no DB seed mechanism exists and the coverage ratchet
  must not sweep data. Image storage is **Vercel Blob, private objects**, decided and
  wired by `dm-prep-suite/locations-handouts`; it needs `BLOB_READ_WRITE_TOKEN` set in
  Vercel project settings, and without it every other prep field still works while the
  image endpoints answer 503.
- **Accessibility** — phone-first hygiene, no formal standard (D10): one-handed, dim
  light, real touch targets, nothing breaks at 320px. Every ticket inherits this.
- **Legal / data** — the SRD 5.2.1 attribution (CC-BY-4.0) is the app's **only** SRD
  notice as of `long-tail-reference-data`. The SRD 5.1 notice came out of the footer,
  the README and `src/lib/srd/attribution.ts` in the same change that stopped serving
  5.1 material, because CC-BY §3(a) is about what is actually distributed: the
  reference browser reads local 5.2.1 data and the `dnd5eapi.co` proxy is gone.
  Adventure text is never encoded (D41). GDPR household exemption holds — sign-up stays
  invite-gated and fail-closed (D20), and D34 only shrinks the public surface.
- **Commercial** — none, but the clock is real now: **session 1 has a date, weeks away**
  (2026-08-29). P1 means "before session 1"; P2 means "by session 2, or whenever".
- **Process** — CI is the source of truth; local checks are a dev aid only. Ticket-only
  commits to `main`; code through a PR on a `claude/` branch. Dependency movement is
  advisory-driven, not calendar-driven: `.github/dependabot.yml` carries an npm entry at
  `open-pull-requests-limit: 0`, so security updates open PRs and routine version bumps
  never do — D26's trigger finally has a sensor. The alerts themselves are a repository
  setting (Settings → Advanced Security), not something git can turn on.
- **Migrations must be additive** — the production migrate job runs in parallel with the
  deploy, so for a minute on every merge old code runs against a migrated database. A new
  column must therefore be nullable, or `NOT NULL` *with a `DEFAULT`* — Postgres fills
  existing rows in and the old code's inserts, which never name the column, take the
  default too. A bare `NOT NULL`, a `DROP`, a `RENAME`, or a `CHECK` over a column that
  already existed all break that window. `src/lib/db/migrations.test.ts` enforces this
  against `drizzle/meta/_journal.json` in CI.

## Decisions

| ID | Decision | Date | Supersedes |
|---|---|---|---|
| D1 | Players first, DM tools deferred until Jamie actually DMs | 2026-08-13 | BRD §2.3 |
| D2 | No offline. Service worker, manifest, IndexedDB and Zustand persistence deleted; the PWA ambition is retired | 2026-08-13 | BRD |
| D3 | Clerk removed entirely; Neon Auth (managed Better Auth) replaces it | 2026-08-13 | — |
| D4 | Neon Postgres + Drizzle; the Supabase stack deleted rather than integrated | 2026-08-13 | — |
| D5 | v1 needs **both** fast lookup and a playable sheet before it counts as table-worthy | 2026-08-13 | — |
| D6 | Simple creation form for v1; the guided wizard is post-v1 | 2026-08-13 | BRD FR-001 |
| D7 | Sheet scope is combat core, not the BRD's eight-tab sheet | 2026-08-13 | BRD §3.1 |
| D8 | Dice roller never — physical dice are the point of a physical table | 2026-08-13 | — |
| D9 | The 2026-08-15 ticket-record deletion is accepted, not reversed. Content survives in git at `1b151fa^` | 2026-08-15 | — |
| D10 | The accessibility bar is phone-first hygiene, not a formal standard | 2026-08-15 | BRD WCAG target |
| D11 | SRD 5.1 (2014) is the rules baseline wherever it differs from the 2024 PHB | 2026-08-15 | — |
| D12 | DM tools are in scope now — Jamie is about to DM | 2026-08-15 | **D1** |
| D13 | A DM edits every character in their campaign, **including live combat state**; the concurrency guard is a hard prerequisite | 2026-08-15 | — |
| D14 | Campaigns with a membership join table; a character may belong to several | 2026-08-15 | — |
| D15 | Multiclassing is out. Single `class_index` stands | 2026-08-15 | — |
| D16 | Navigation is a bottom tab bar, built once, serving both the sheet↔reference round trip and the DM screen | 2026-08-15 | — |
| D17 | Encounters persist between sessions; monster HP per-instance | 2026-08-15 | — |
| D18 | On screen the word is **race**, not species — SRD 5.1 is the baseline. `speciesIndex` stays as the column name | 2026-08-15 | — |
| D19 | One global `dm`/`player` role gating the DM *tools*; per-campaign authority stays `campaigns.dm_user_id` | 2026-08-15 | — |
| D20 | Sign-up gated by a shared invite code, fail-closed; the GDPR household exemption holds | 2026-08-15 | — |
| D21 | Skills modeled fully: proficiencies, expertise, Jack of All Trades | 2026-08-15 | — |
| D22 | Spell preparation is built; wizard is the two-list model | 2026-08-15 | — |
| D23 | Class resources tracked as generic per-character counters with a recharge rule | 2026-08-15 | DND-033's fallback |
| D24 | A shared table screen at `/table/[token]`, reachable without sign-in via an unguessable regenerable token; shows player-visible state, never monster HP | 2026-08-15 | — |
| D25 | DM edits reach the player's sheet by polling (~15 s); no attribution log | 2026-08-15 | — |
| D26 | `@neondatabase/auth` pinned exactly `0.5.0-beta`; upgrade at GA or on a security advisory — otherwise never | 2026-08-15 | — |
| D27 | Preview-DB credentials stay unset; the production migrate job hard-fails when `DATABASE_URL` is missing | 2026-08-15 | DND-024's full fix |
| D28 | Installable PWA, online-only: the service worker's only job is the `/offline` fallback page | 2026-08-16 | the installability half of **D2** |
| D29 | `docs/rules/` is user-facing product content; all eleven chapters ship under `/rules`, keeping their double duty | 2026-08-16 | reverses `docs/rules/README.md` |
| D30 | Session notes typed during play and written up after; per-note "players can read"; private character notes isolated from the D13 predicate | 2026-08-16 | notes open questions; DND-058 |
| D31 | The rules baseline becomes the **2024 rules — SRD 5.2.1** (CC-BY-4.0). SRD content ships as local JSON data modules; the 2014 `/api/dnd5e` namespace is retired, never repointed in place | 2026-08-29 | **D11** |
| D32 | On screen the word is **species** — the 2024 rules retire "race"; the `species_index` column was named right all along | 2026-08-29 | **D18** |
| D33 | **Teaching is the job until the first campaign runs**; in-session the sheet still wins. The learn-to-play layer (glossary, learn chapters, roll walkthroughs) is in scope, aimed at this table | 2026-08-29 | the 2026-08-13 onboarding/tutorials kill |
| D34 | **Everything behind sign-in** — the public half retires; the middleware matcher inverts to deny-by-default. Exceptions: `/table/[token]` (D24 stands), `/auth/*`, `/offline`, and the reference data endpoints (public + CDN-cached — SRD content, no personal data) | 2026-08-29 | the "reference browsing is public" rule; part of D29's rationale |
| D35 | **Milestone leveling**: one `campaigns.milestone_level` write; "level-up waiting" is derived, never fanned out per character. XP award UI retires behind an off-default gate | 2026-08-29 | resolves DND-055's open question |
| D36 | The **guided creation wizard** replaces the simple form for creation (the edit form survives): vibe quiz → recommended defaults accepted one tap at a time → advanced escape hatch. Creation from a campaign join attaches the finished character to that campaign | 2026-08-29 | **D6**'s deferral |
| D37 | A **player campaign view** exists — party, discovered content, latest recap — reached from the sheet, not the front door | 2026-08-29 | D30's "no player campaign screen" clause |
| D38 | DM prep entities are **revealable**: public layer + DM-only layer + `revealed_at`. Player-facing queries select public columns only; DM-only data never leaves the DM | 2026-08-29 | extends D13/D30 |
| D39 | Design language: **Apple HIG structure, subtle-fantasy tokens**, phones only. Front door is your character; reference becomes the search-first Library; the tab bar stays (renamed Character · Library · DM) | 2026-08-29 | amends **D16** |
| D40 | **Per-campaign feature gates, defaults off** — gates hide UI, never delete state; the DM switches surface on as the group learns | 2026-08-29 | — |
| D41 | The first campaign runs from a **published starter box**; adventure text never enters app data — the DM's own notes only. Session recaps publish as **shared campaign notes** (one player-facing record; the session log is a derived view, not a second entity) | 2026-08-29 | extends D30 |
| D42 | The 2014-era prototype characters are **deleted** before the friends arrive — no legacy mode, no conversion. New 2024 columns need no backfill story | 2026-08-29 | — |
| D43 | **One user is one character**, UI-only: the list, the *New* button and the join picker go; the model and the API stay one-to-many. **Only the DM retires a character**, from the profile page, and the player is then sent into the wizard | 2026-09-05 | moves **D13**'s boundary: the DM arm reaches deletes |
| D44 | **The DM lands on `/dm`** with a two-stop bar (Library · DM); the create route refuses the `dm` role | 2026-09-05 | amends **D39**'s bar for the DM |
| D45 | **A DM-only page per player character** — who plays it, readiness with one-tap fixes, a DM-private note **keyed by the character**, the Inspiration hand-over, links to the sheet. The seven existing characters are fixed by the DM's hand from it, nothing automatic | 2026-09-05 | extends **D13**/**D38** |
| D46 | **Weapon Mastery is the sixth gate**, off by default, with the masteries pre-picked from the kit silently at creation; **Heroic Inspiration stays ungated**, one line clearer | 2026-09-05 | extends **D40** |
| D47 | **The Tutorial campaign is session zero — a campaign that starts and ends in one night.** The real campaign follows with the same table, and the characters carry forward | 2026-09-05 | extends **D41** |

## Open questions

- **Does the app keep the name "D&D 5e Companion" after the 2024 move?** The name is
  baked into the header, tab-title template and the installed PWA manifest — deciding
  before the friends install avoids a re-install-the-icon moment. *Jamie.* Blocks
  nothing.
- **What hosts the table screen — a TV across the room, or a tablet propped mid-table?**
  Decides `dm-run-suite/table-screen-legibility`'s fix: fit-to-screen density for a TV
  vs auto-scroll-to-active for a propped device. *Jamie / the table.* No longer blocks:
  that stub shipped the propped-device answer (chromeless route, sticky round, the turn
  scrolled to centre, conditions and names sized up), which is the one that survives
  being wrong — a TV still shows the turn, it just shows fewer rows around it. A "TV"
  answer now buys a density pass, not a rewrite.
- **Does character creation happen together at a session zero, or each friend at home?**
  `guided-creation` has shipped either way, so this no longer sets a deadline — what it
  decides now is how much the party-composition hints do: a table building apart, one
  phone at a time, is the case they were written for, and a room building together will
  have said it out loud before the app can. *Jamie / the table.* Blocks nothing.

*Resolved 2026-08-29: XP vs milestone → milestone (D35). "Do the characters fit SRD 5.1
fields" → superseded by the 2024 migration (D31) and the prototype deletion (D42).
Earlier resolutions: see D20–D26 (2026-08-15) and D30 (2026-08-16).*

## Run log

| Date | Commit | What changed |
|---|---|---|
| 2026-08-15 | `b4501fc` | First run. Register established from the recovered 2026-08-13 scope decisions plus a fresh interrogation. Posture: **launch**. 18 decisions recorded. Seven lenses run. 30 tickets cut (DND-016–045). |
| 2026-08-15 | — | Amended by ticket work, not a `/project` run: the prototype push recorded D19–D27, resolved four open questions, refreshed the Features table. |
| 2026-09-05 | — | Amended by ticket work, not a `/project` run: the `first-table` epic shipped whole (17 stubs, one PR) five days before session 1; D43–D47 recorded from the audit's Decisions table (`.icm/docs/2026-09-05-first-timer-audit.md`) and the two answers Jamie gave on the stubs that had left a decision open. |
| 2026-08-29 | `fc1af5e` | Re-run. Posture: **launch**, aimed at the first campaign — session 1 dated, weeks away. Intent rewritten (teaching-first, D33); the morning's planning Q&A + research adopted with provenance (`.icm/docs/2026-08-29-*`); 12 decisions appended (D31–D42). Ticket-scout + five lenses (product, ux, data, tech, copy; market and legal dropped — prior-art and licensing freshly covered by the research doc). Six epics adopted; 6 stubs added (sign-in-wall, asi-and-feats, table-screen-legibility, tracker-ergonomics, advisory sensor, branch prune), ~20 amended, priorities re-ranked to the calendar. |
