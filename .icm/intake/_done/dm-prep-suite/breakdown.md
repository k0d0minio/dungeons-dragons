# Epic: dm-prep-suite — the DM's gated prep tools

- priority: P1
- sources: .icm/docs/2026-08-29-first-campaign-direction.md, .icm/docs/2026-08-29-first-campaign-research.md §4

## What was understood

Jamie (the only `dm` role) preps a **published starter box** — research recommends
*Heroes of the Borderlands* (2024 rules, levels 1–3) — and the app holds **his own
prep keyed to it**: NPCs, locations, session plans, encounters. Licensing rail:
adventure text is never encoded as app data; everything the DM types is his
private freeform prep referencing a book he owns. SRD content (monsters, rules)
may ship as data.

He chose all four gating kinds. This epic implements two: **DM-only tools**
(everything here sits behind the existing global `dm` role and inside a campaign)
and **secret DM state** (every prep entity has a player-facing layer and a
DM-only layer). The other two — reveal gates in play and per-campaign feature
gates — are `dm-run-suite`'s reveal controls and this epic's final stub
respectively.

Shared pattern to establish in the first stub and reuse: a **revealable entity**
— `campaign_id`, a public layer (name, description, optional image), a DM-only
layer (secrets, notes, stats), and a `revealed_at` timestamp (null = hidden).
Party is 5–6; encounter difficulty must read against who's actually attending.
Cross-epic: the encounter builder needs 2024 monster data
(`srd-2024-migration/srd-data-layer`).

## Build order

1. `npc-roster` — NPCs with a public face and a secret layer; establishes the
   revealable-entity pattern.
2. `locations-handouts` — places and images; decides the image-storage question.
3. `session-plans` — Lazy-DM prep: strong start, scenes, secrets, treasure.
4. `encounter-builder` — monsters + difficulty budget, feeding the tracker.
5. `campaign-feature-gates` — the app grows with the group.

> Amended 2026-08-29 (`/project` re-run): priority raised to **P1** — session 1
> has a date and Jamie preps in this suite. Data-lens rails now mandated in the
> stubs: blob-first upload ordering, magic-byte validation, no SVG in the
> allowlist, upload-only (no import-from-URL), and the `characters.portrait`
> column rides the storage decision here.

> Amended 2026-09-03 (`npc-roster` shipped): the revealable-entity pattern the epic asked
> the first stub to establish exists, in three pieces the next four stubs should reuse
> rather than re-derive.
>
> **The columns**: `revealableColumns()` in `src/lib/db/schema.ts` — `id`, `campaign_id`
> (cascading FK), `revealed_at` (timestamptz, nullable, **no default**), `created_at`,
> `updated_at`. A factory, not a shared object, because Drizzle column builders are
> stateful. Spread it, then write the public layer, then the DM-only layer under its own
> comment. `campaign_npcs` is the worked example.
>
> **The queries**: `src/lib/db/revealable.ts` — `runByDm(table, dmUserId)` (the EXISTS
> that folds `campaigns.dm_user_id` into any WHERE, generic over anything with the shape),
> `campaignRunBy` (the pre-insert read, because an INSERT cannot carry an EXISTS),
> `revealedOnly(table)` and `revealStamp(revealed)` — the reveal seam
> `dm-run-suite/reveal-controls` writes through — and `isRowId`. `notes.ts` and
> `encounters.ts` still carry their own copies of the first two; they predate this module
> and converting shipped authority code was not `npc-roster`'s risk to take, so the next
> thing to touch either of them should adopt these.
>
> **The public/DM-only split, enforced twice.** In the data layer, `npcPublicColumns` is
> the only selection a player-facing read may name, and the `PublicNpc` it produces has no
> DM-only field on it, so a leak is a compile error. In the UI, `NPC_PUBLIC_FIELDS` and
> `NPC_SECRET_FIELDS` in `src/lib/npcs/schema.ts` are one list per layer, and they both
> validate the field *and* render it — a column added to the table and not classified gets
> no editor at all (a visibly missing field) rather than being quietly drawn in the public
> half. A unit test holds the two lists to exactly the table's editable columns.
> `locations-handouts` should copy that shape with its own pair of lists.
>
> Two boundaries this stub deliberately did not cross. **Nothing reveals**: `revealedAt`
> is absent from both zod schemas, so neither the editor nor a hand-rolled PATCH can stamp
> the column — the roster shows "Hidden"/"Revealed" and offers no control, and
> `reveal-controls` is what makes it settable. **No image column**: `locations-handouts`
> owns the storage decision for the suite (blob-first ordering, magic-byte validation, no
> SVG, upload-only) and `campaign_npcs` gains its slot in that ticket, alongside
> `characters.portrait`.
>
> Two UI decisions the rest of the suite inherits. Prep lives on its **own page** under
> `/dm/campaigns/[id]/`, reached from a "Prep" card on the campaign page — the campaign
> page is what gets opened mid-session, and a roster is long. And the DM-only block is one
> component (`SecretLayer`) used by both the editor and the read view, carrying three
> signals — dashed border on a tinted ground, an eye-with-a-slash heading with a "DM only"
> badge, and a line saying the rule in words — because a DM reads this on a phone with
> players either side of him and needs to know at a glance which half he can turn around.

> Amended 2026-09-03 (`locations-handouts` shipped): the two remaining questions this
> epic left open are answered, and the last three stubs inherit both answers.
>
> **Image storage is Vercel Blob with `access: 'private'`.** The app already deploys to
> Vercel, so it is one environment variable rather than a second vendor;
> `src/lib/images/store.ts` carries the comparison against Postgres `bytea`, S3/R2 and an
> upload SaaS. Private is the load-bearing half: no URL serves an object, the store key
> is redacted out of every read in the data layer, and the bytes come back only through
> an authed route. `src/lib/images/slot.ts` is the whole feature as three verbs over two
> closures — "which row" and "which column" — so `session-plans` or anything else that
> wants a picture writes a route file and nothing more. The data-lens rails are all in
> there: blob first, magic-byte sniffing, no SVG, upload only, 4 MB.
>
> **The prep-entity shape is now three pieces, not two.** Beyond `revealableColumns()`
> and `revealable.ts`, `src/lib/prep/fields.ts` holds the field descriptor, the three
> lengths and the zod builders, and `src/lib/prep/responses.ts` holds the 401/404/503/400
> answers every prep route gives. `src/components/campaigns/prep-fields.tsx` holds
> `SecretLayer`, `FieldInput` and `ReadField` — the DM-only marking is one component
> across all three screens, because it is a safety signal read at a table with players
> either side of the phone, and three copies would be three chances for one screen to say
> it less clearly. A new prep entity is now: a table spreading `revealableColumns()`, a
> data module, a field-list module, two route files and a roster component.
>
> Still not crossed, and still `dm-run-suite/reveal-controls`': **nothing reveals.**
> `revealedAt` is absent from all six zod schemas across the three entities, so no
> request in this app can stamp the column. And **no player surface** exists for prep of
> any kind.
>
> One thing rode along because no other stub owned it: `characters.portrait`, nullable,
> for `dm-run-suite/player-campaign-view`. The column and the storage exist; nothing
> writes it, and where a player edits their own face is that stub's judgment.

> Amended 2026-09-03 (`session-plans` shipped): the prep-entity shape now covers entities
> that **own rows**, and the last two stubs inherit that as well as everything above.
>
> **A plan's children are scoped through the plan, not by a second `campaign_id`.**
> `session_plan_items` and `session_plan_links` carry `plan_id` and nothing else, and
> `ownedPlan` in `src/lib/db/session-plans.ts` is the WHERE fragment that reaches the DM
> through it — `runByDm` nested one hop deeper, so the authority rule still has exactly
> one definition. It is local to that module on purpose: a session plan is the first prep
> entity with children, and generalising a shape from one example is guessing.
> `encounter-builder` is the likely second, and it can move it into `revealable.ts` then.
>
> One thing in `revealable.ts` did move. `runByDm` and `seatedAt` now take
> `CampaignScopedTable` (a `campaign_id`, which is all either of them reads) rather than
> `RevealableTable`; the reveal helpers still demand the full shape. That is what lets
> `encounters` — campaign-scoped, and older than `revealableColumns()` — be read through
> the same fragment as the prep tables instead of forcing a hand-written copy, which is
> the one thing that module exists to prevent.
>
> **A tick is not a reveal, and the code says so twice.** Scenes and secrets carry
> `checked_at`, shaped exactly like `revealed_at` (null is unticked, no second boolean),
> and `checkStamp` is deliberately a separate function from `revealStamp` rather than a
> second caller of it — one function serving both would be one edit away from a tap at a
> table publishing a clue. `session_plan_items` has no `revealed_at` at all, and a test
> pins that.
>
> **The public layer can honestly be small.** A session plan's is `title` and
> `session_date` — the night as it would be announced — and nothing else. The recap the
> party reads afterwards is a shared `campaign_note`, which already exists with its own
> `session_date` and `shared_with_players`; a recap column here would have been two
> answers to one question. A strong start is *heard* at the table and never read off a
> plan, so it sits behind `SecretLayer` with the treasure. `campaign-feature-gates` should
> take the same line: fit the pattern honestly or say why the entity does not.
>
> `src/lib/prep/fields.ts` gained a third `PrepFieldKind`, `date`, with `optionalDate`
> beside `optionalText` and `layerShape` dispatching on the kind — so the control and the
> validator are still decided in one place, and `FieldInput` renders the platform picker.
> `isSessionDate` is reused from `src/lib/notes/schema.ts` rather than re-derived; it
> already knows that `2026-02-30` is not a day.
>
> Two UI decisions the run-time surfaces should inherit. The mid-session shape is the
> **default** one: a checklist row is one full-width button and one tap ticks it, with the
> arrows, the reword and the delete behind an "Arrange" toggle, because a DM ticking a
> secret off has a table waiting and a stray touch must not be able to delete one. And
> **reordering sends the whole list**, not "move this one up": `neon-http` has no
> transactions, so the data layer refuses any set that is not exactly the plan's current
> one for that kind and renumbers it densely in a single CASE update — a stale tab is
> rejected outright rather than leaving half a list renumbered.
>
> Still not crossed, and still `dm-run-suite/reveal-controls`': **nothing reveals.**
> `revealedAt` is absent from all eight zod schemas across the four entities. And **no
> player surface** exists for prep of any kind.

> Amended 2026-09-03 (`encounter-builder` shipped): the cross-epic dependency this epic
> flagged is discharged, and the last stub inherits one decision from how it was.
>
> **The 2024 budget is a table and four functions, not a rules engine.**
> `src/lib/encounters/budget.ts` is pure — no fetch, no React, no db — and the table is
> transcribed from `docs/rules/10-dm-guide.md` rather than derived from anything, because
> the 2024 method *is* a lookup: sum each attending character's per-level budget, sum the
> monsters' listed XP, compare. The multiplier tables are gone from the rules and are
> deliberately not reimplemented; a test pins that eight goblins cost eight goblins. It
> sits beside `experience.ts` rather than inside it — one prices a fight being assembled
> (lines: "four goblins"), the other one that has been fought (rows: four goblin rows) —
> and the two shapes are not worth folding together for the one `count × xp` they share.
>
> **The builder feeds the tracker and does not touch it.** `tracker.ts` has not a line
> changed. The seam is the create route: `POST /api/campaigns/[id]/encounters` now takes
> an optional `characterIds` and `monsters`, and hands them to the same DM-scoped
> `addCharacterCombatants` / `addMonsterCombatants` the tracker's own Add-combatants
> sheet uses. Party first (the PCs head the order the tracker falls back to before
> initiative is rolled), then the lines in order, sequentially — each add reads the
> encounter's rows to pick the next `sort_order` and to number a second wave of goblins
> from where the first stopped, so overlapping adds would mint two "Goblin 1"s.
> `neon-http` still has no transactions, and the honest failure here is a real encounter
> with some of its bodies in it, which the DM lands on and can see.
>
> **A cap that two layers enforce is defined once.** `MAX_MONSTER_LINES` and
> `MAX_MONSTER_INSTANCES` live in `budget.ts` — a module with no server imports, so the
> client component and the route schema share them by construction rather than by two
> copies of `20`. The data layer's own `MAX_MONSTER_BATCH` clamp stays where it is as a
> backstop, not a second opinion.
>
> **Two UI decisions `campaign-feature-gates` should inherit.** The one-field create form
> on the campaign page is **gone**, not kept beside the builder: two doors to the same
> thing is how a DM ends up back at the tracker with no difficulty readout, and the
> builder's first field is the same name field. And a readout that cannot honestly
> compute **says so instead of printing a number** — with nobody ticked there is no
> budget, and "Low" against a budget of zero would be a guess wearing arithmetic's
> clothes. Past High it **warns and never blocks**; a DM who means to run a deadly fight
> is allowed to, and the only thing they must not be is surprised.
>
> Still not crossed: **nothing reveals** (`revealedAt` is absent from every prep zod
> schema in the epic), and an encounter is still DM-only — the players' view of a fight
> is the table screen's share token, which this stub did not touch.

> Amended 2026-09-03 (`campaign-feature-gates` shipped): the epic is complete, and the
> last stub answered the one question the others left it — what a gate is allowed to be.
>
> **A gate hides UI and never deletes state, and three layers enforce it.**
> `campaigns.gates` is one nullable `jsonb` column (`NULL` is every gate off, so the
> migration is one `ADD COLUMN` with no backfill and no default); `src/lib/campaigns/gates.ts`
> is dependency-free and holds the four keys, the copy the DM decides from, `parseGates`
> and `resolveGates`; and every gated card takes a boolean prop defaulting to **on**. No
> gate writes a character column anywhere — the cards are simply not rendered, so
> exhaustion keeps subtracting from every d20 test with its stepper hidden, a long rest
> keeps refilling a hidden rage pool, and a hidden purse keeps its gold. The sheet tests
> pin that per section by re-rendering with the gate open and finding the state untouched.
>
> **Every read fails towards more surface.** A character on no campaign, an id that is not
> a uuid, and a character the viewer may not see all resolve to everything on; two
> campaigns resolve to the **union** of what their DMs switched on, because one character
> has one sheet and a card in use at one table must not vanish because the other table is
> simpler. `gatesForCharacter` is scoped by `viewableBy` — the D13 predicate the sheet
> itself is behind — so a DM opening a party member's sheet sees the screen that player is
> looking at. A gate is a complexity dial, never an access control, and nothing about
> anyone else's data is decided by one.
>
> **The four gates fit the entity honestly, and one of them says less than its name.**
> Spell preparation off means the card is the character's own spells, fixed, no toggles
> and no class list — with the creation wizard's curated set as the display-only fallback
> for a class-list caster whose record legitimately holds nothing (`fixedSpellIndexes`).
> Conditions and class resources off remove their cards whole. The coins gate covers the
> purse and **not** encumbrance, because this app has never had encumbrance; the gate is
> named for the pair in the register and the settings copy promises only what exists.
> What a character *carries* is never gated — items are the sheet's subject and half of
> what it derives.
>
> **`CURATED_SPELLS` moved out of `wizard.ts`** into `src/lib/characters/curated-spells.ts`,
> indexes only. `wizard.ts` reaches the SRD spell data directly, and `spells.json` is the
> long-tail file the app deliberately serves over `/api/srd/*` rather than bundling (D31)
> — importing it into a sheet card would put 339 spells into the page opened mid-combat.
> `curatedSpells` stays in `wizard.ts`, filtering these lists against the data it already
> loads.
>
> Two boundaries this stub did not cross. **Creation and editing are ungated**: the wizard
> runs before a character has a campaign, and the edit form writes the *known* list, which
> no gate touches. The level-up planner is wired for exactly one sentence — the one that
> tells a cleric where to go and prepare, when the gate says there is nowhere. And **no
> gate reaches the DM's own screens**: the party glance, the tracker and the table screen
> show everything, because they are the DM's, and the simplification is for the players.

