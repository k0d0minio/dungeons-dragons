# Tutorial campaign seed — 2026-09-07

> Requested by Jamie: read production, find the Tutorial campaign and its characters,
> research first-time play, interrogate him on the story, and seed a complete one-night
> tutorial into the app — session-zero page, NPCs, locations, handouts, encounters, plan.
> This is the record of what was written to production and why, so the next session
> knows what is in the database without reading it. The content itself lives in the
> campaign's prep tables (D38: DM layer private, public layer revealed by tap), not here.
> Companion research brief on one-night structure and level-1 encounter maths for seven: a follow-up in this folder.

## What was found

- One campaign, **Tutorial** (`a66f9631-…`), Jamie as DM, eight player seats, seven
  characters attached. Zero prep: 0 NPCs, 0 locations, 0 handouts, 0 encounters, no
  session-zero page, no gates, no milestone. One empty plan, "Session 1 - Intro", dated
  2026-09-10, not announced.
- The seven attached characters, all level 1: Ava Delacroix (paladin, Dânia), Melnur
  Trollbelt (fighter, João), Lyria Nightrune (sorcerer, Laura), LochDeen GoldenBird
  (warlock, Guilherme), Wobbles Wobbleton II (bard, Eneko), Dagmund, O Isqueiro (druid,
  Tomás) and the wizard on the `cunha@example.com` test account. The 2026-09-05 audit's
  findings still held on every one: no weapon equipped anywhere, no spell slots on five
  casters. Dagmund additionally had **no inventory rows at all** and no background; the
  test wizard had no gear and no levelled spells.
- Off the roster: Rafstar (rogue, all scores 10, no gear, no seat) and Freire Simão (a
  seat, no character). Neither was touched.

## Jamie's decisions (Q&A, 2026-09-07)

| Topic | Decision |
|---|---|
| Roster | The seven on the campaign as-is; the cunha wizard treated as a real seat. |
| Tone | Classic heroic fantasy. |
| Hook | Something taken from the village: livestock, then the shepherd. |
| Villain | A cult (cultists, a priest-acolyte leader). |
| Party tie | Strangers at the inn when it happens. |
| Ending | Won, with a loose thread into the real campaign. |
| Lethality | Nobody dies tonight. |
| Length | About three hours; two fights plus one optional. |
| Flavour | Iberian-flavoured village; all text in English. |
| Pre-reveal | Session-zero page, the village, and the notice handout. Everything else hidden. |
| Mechanics to teach | Ability checks → talking to NPCs → combat basics → spells, short rest, healing. |
| Cult motive | Opening a sealed door under the hill; each sheep weakens it, the shepherd would finish it. |
| Loose thread | A letter from a patron in the city, signed "M.", with a cracked-bell seal. |
| Encounters | Pre-built with all seven PCs and monster HP set. |
| Sheet fixes | Done directly in the database now (reverses the 2026-09-05 "DM's hand" choice for these seven, at Jamie's word). |

## The story, in one paragraph

Vale das Cabras, a cork-oak hill village under a rock called the Penedo do Sino. Two
hundred years ago the founders sealed a door under it and set a family of shepherds, the
Keepers, to hold it: *the flock keeps the door; name them and it holds; spill them and it
opens.* Brother Anselmo, a sacristan thrown out of the chapel for stealing the Keepers'
register, read the warning as a recipe. For seven nights his cult has bled a sheep at the
door; on the eighth he needs the shepherd who knows the flock's names. Zé Pastor was taken
last night. Seven strangers are at the inn when his granddaughter bursts in. They follow
the dog up the goat trail, fight an ambush, rest and question a captured cultist, then
break the rite at the Bell Door and re-seal it by ringing the Keeper's bell while Zé speaks
the forty names. The letter in Anselmo's habit says there are three other doors.

## What was written (all on campaign `a66f9631-9f47-45fb-aae4-fb28d4f19400`)

- `campaigns.session_zero` — the players' one page (pitch, tone, tie, lethality, the one
  rule, phones, tonight). `milestone_level` set to 1.
- **7 NPCs** (ids `5e1a0001-…-0001..0007`): Rosalinda Carvalho (innkeeper), Zé Pastor
  (the shepherd, the rescue), Padre Amaro (chapel, optional), Brother Anselmo (boss),
  Tiago Dois-Dedos (the cultist who surrenders), Beatriz "Bia" Pastor (the hook's face),
  Farrusco (the mastiff; Speak with Animals is the druid's moment). Each carries public
  summary/description and DM-only motivation, secrets, twist, stat reference and notes.
- **6 locations** (`5e1a0002-…`): Vale das Cabras (**revealed**), A Cabra Coxa (the inn),
  Curral do Zé (the ability-check scene), Trilho das Cabras (Fight 1), Penedo do Sino, the
  mouth (camp, sheep, stealth), The Bell Door (Fight 2, the re-sealing challenge).
- **4 handouts** (`5e1a0003-…`): Notice nailed to the inn door (**revealed**), Torn page
  from the Bell Book (on Tiago), Words carved above the Bell Door (the solution), Letter
  with a cracked-bell seal (the loose thread; reveal at the inn, last scene).
- **3 encounters** (`5e1a0004-…`), each with all seven PCs already added:
  - *Ambush on the goat trail* — 4 cultists (9 HP) + 2 giant rats (7 HP). 150 XP against
    a seven-PC level-1 Low budget of 350: a warm-up, six monsters to seven PCs.
  - *The Bell Door* — Brother Anselmo (priest-acolyte, HP raised to 16 by ruling) + 4
    cultists + 2 skeletons (13 HP, staged: round 2, and when Anselmo is below 8 HP).
    250 XP, still under Low; the builder's level-one rail will flag the acolyte's
    average damage, which is why his HP was raised rather than adding bodies.
  - *The feed shed (optional)* — one swarm of rats. A zero-stakes first initiative.
- **Session plan** "Session 1: The Lame Goat and the Bell Door" (the existing row, retitled):
  strong start, treasure, 7 timed scenes (15/20/25/30/15/45/15 min), 10 secrets, and links
  to every NPC, location and encounter. **Not announced** — its date is still 2026-09-10 and
  Jamie said "might be tonight"; announcing puts the date on the players' page, so that is
  his tap once the night is fixed.
- **7 DM notes** (`character_dm_notes`), one per attached character: who plays it, a
  suggested tie to tonight, one question to ask them, what to remind them of in play, and
  what was fixed.
- **Sheet fixes**: weapons readied per `weaponsToReady` (Ava longsword + javelin; Melnur
  greatsword + shortbow; Lyria dagger + spear; LochDeen dagger; Wobbles quarterstaff);
  standard slots seeded (druid, sorcerer, bard 2 × 1st; warlock 1 pact); Dagmund given the
  SRD druid kit with armour, shield and staff readied; the test wizard given the SRD wizard
  kit with a dagger readied. `version` bumped on every character row touched. Weapon
  Mastery left `null` (the gate is off).

## Left for Jamie

- Dagmund has no background. Pick one with Tomás before the first roll.
- The test-account wizard: play it (rename, Int 16, four 1st-level spells) or retire it.
- Rafstar and Simão are not on the roster; seat or leave.
- Announce the plan once the date is right.
- The Bard has no attack cantrip; the note suggests offering Vicious Mockery as a swap.
