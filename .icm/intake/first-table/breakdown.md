# Epic: first-table — the tutorial night, and the rules of the table

- priority: P1
- sources: `.icm/docs/2026-09-05-first-timer-audit.md` (the walkthrough of production,
  2026-09-05, and Jamie's Q&A recorded in its Decisions section);
  `.icm/docs/2026-09-05-first-timer-research.md`

## What was understood

Session 1 is **Thursday 10 September 2026**, five days from the audit — and it is not
session 1. Jamie's answer is that the Tutorial campaign *is* the group's session zero: a
campaign that starts and ends in one night, with the real campaign after it. Seven
friends have already built level-1 characters through the wizard, and the walkthrough of
their real sheets found the same gaps on every one of them: **no weapon equipped** (so
the Play segment shows no attack — the Fighter's only attack is Unarmed strike), **no
spell slots** on five of the six casters (the wizard never writes them; the sheet waits
for a tap nobody knows to make), **no Weapon Mastery** chosen, and a **party glance that
prints the unarmoured AC column** for everyone (the Paladin's sheet says 18, the glance
says 10). Nothing tells the players when the session is.

Jamie set three rules for the table the same day: **one user is one character**, **the
DM never creates one** (today the DM is the one account the app pushes into the wizard,
because he has no character and the front door is character-first), and **the DM sees,
edits and annotates every player character in a profile view** — seeing and editing
exist (D13), the profile, the notes and "who plays this" do not.

The research settled what to cut, and the strongest evidence is the starter box itself,
because WotC already cut it for exactly this audience: its class boards carry **no Weapon
Mastery**, a short rest is a flat 4 HP, background bonuses are pre-baked, there is no
XP — and it *keeps* Heroic Inspiration, as tokens. Every source wants the same
per-character artefact in front of a beginner: move, the attack written as "roll d20 + 5
vs AC, then 1d8 + 3", the *one* bonus action, the *one* reaction, cantrips-vs-slots.
Phones lose to paper on scrolling, not on lookup. Session zero is where beginners'
characters get built or fixed together, and level 1 is "the danger zone" (fewer monsters
than characters, CR ≤ 1/4, level 2 within four hours). The DM's first prep step is the
characters, and it is about the player: what they want, what they are nervous about,
one question to ask them next session.

**Jamie's decisions** (the audit's Decisions table, 2026-09-05): one character —
UI-only; only the DM retires a character; the DM lands on `/dm` with a two-stop bar; the
profile is its own DM page per character; Weapon Mastery goes behind a sixth gate,
pre-picked silently; Heroic Inspiration stays, one line clearer, grantable by the DM;
the "your turn" card is pinned at the top of Play; inventory and Library are both
trimmed; the seven existing characters are fixed **by the DM from the profile view**,
nothing automatic; announcing the night — yes. **Before Thursday: the sheet fixes, the
DM's door and the one-character rule, and the profile view with notes.** The rest is P2.

Rails the whole epic inherits: **nothing derived is stored** — AC is computed from
equipped armour wherever it is shown, spell-slot maxima stay the one exception; **a gate
hides UI and never deletes state** (D40); **a DM-only surface selects DM columns and no
player-facing query ever does** (D38); **migrations are additive**; **`neon-http` has no
transactions**, so any fix that writes two rows is ordered to fail benignly; and **the
sheet mid-session gets no fiddlier** (D33) — every new control here is on the DM's
screens or above the fold of Play. The three "ready a character" rules (equip the kit's
weapon, seed the standard slots, pick the masteries) are written **once**, in the rules
layer, and called from both the wizard and the DM's fixes.

## Build order

1. `creation-readiness` — P1. The wizard equips the kit's weapon, seeds the standard
   slots and pre-picks masteries, as three pure functions the profile's fixes reuse.
2. `glance-derived-ac` — P1. The party glance and the list print the AC the sheet prints.
3. `dm-front-door` — P1. The DM lands on `/dm`, the bar has two stops, the create route
   refuses the role.
4. `one-character` — P1. A player's Character stop is their sheet; no *New*; the join
   link brings the one character.
5. `weapon-mastery-gate` — P1. The sixth gate, off by default.
6. `dm-character-profile` — P1. The DM's page per character: played by, readiness with
   one-tap fixes, the Inspiration grant, links to the sheet.
7. `dm-character-notes` — P1. The DM-private note on a character.
8. `your-turn-card` — P2. The turn, pinned at the top of Play.
9. `announce-the-night` — P2. The plan's public layer reaches the players.
10. `retire-a-character` — P2. The DM retires a character; the player is sent back into
    the wizard.
11. `one-night-campaign` — P2. Close the Tutorial and carry the table into the real
    campaign.
12. `session-zero-one-pager` — P2. The page the players read: tone, ties, lethality,
    phones — and the crib's "before the first roll" stop.
13. `level-one-rails` — P2. The encounter builder warns about the things that kill a
    level-1 party.
14. `inventory-trim` — P2. Attuned hidden until it matters; packs folded.
15. `library-search-first` — P2. The Library opens on a search box across all six types.
16. `between-sessions-questions` — P2. Two questions and a highlight per player at
    close-session, landing in the DM's notes.
17. `heroic-inspiration-line` — P2. One line that says what it is and when it arrives.

Stubs 1–4 are independent of each other and can ship as four PRs in any order; 5 needs
1; 6 needs 1 and 2; 7 needs 6. The P2 tail is independent except where a stub says
otherwise.
