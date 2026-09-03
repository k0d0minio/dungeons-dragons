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
