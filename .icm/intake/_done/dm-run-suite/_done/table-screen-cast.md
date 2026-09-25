# Stub: The table screen shows anything the DM casts at it

- feature-slug: table-screen-cast
- sequence: 9 of 9
- depends-on: reveal-controls, table-screen-legibility
- priority: P1
- size: L
- sources: Jamie, 2026-09-07 (the ask, verbatim below); D24; D38; D40

Jamie: *"can we extend the idea of the table screen to also show off the NPCs and
the places and handouts, it's most likely going to be a laptop so make the text big
enough to read from across the table. Right now it is only present for encounters. I
want it available all the time, mainly for the interaction but also for teaching
purposes, I as the DM should be allowed to show anything from the table screen. A
character's sheet (stripped of private and DM stuff), a monsters description, a
handout, the description of a place…"*

The screen existed only while a fight did, because its token hung off
`encounters.share_token`. Four decisions, taken with Jamie on 2026-09-07:

1. **One link per campaign** (`campaigns.table_token`). Opened once on the laptop and
   left there all night; the encounter tokens already handed out keep working and
   answer in the same shape.
2. **A spotlight the DM moves** (`campaigns.table_spotlight`, one `jsonb` pointer).
   `NULL` is "showing the fight, or nothing". A pointer, never a copy.
3. **Casting reveals.** Showing prep to the room is telling the party, so the cast
   stamps `revealed_at` where it is null — the public screen and the players' own
   phones can never disagree about what the party knows.
4. **Seven castable kinds**: NPC, place, handout, a character sheet stripped of coins,
   bags and notes, and — for teaching — a monster, a spell or a condition out of the
   SRD. The SRD three are *not* resolved behind the token: the browser fetches them
   from the public `/api/srd/*` data, so a stat block on the wall is the book's page
   and D24's line (no monster HP from *this* fight) is untouched.

Legibility is the second half of the ask and is answered by one font size on the
screen's root with every rule below it in `em`, plus an A−/A+ control kept per screen
in `localStorage`. That also settles the register's open "TV or propped tablet"
question by handing it to whoever is looking at the screen.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-run-suite/table-screen-cast.md` and the epic's `breakdown.md`. The
shared table screen exists at `/table/[token]` behind `encounters.share_token` and
shows initiative plus the newest reveal. Make it the campaign's screen: a
`campaigns.table_token` link that outlives any fight, a `campaigns.table_spotlight`
pointer the DM moves from a remote page at `/dm/campaigns/[id]/table`, and seven
castable kinds (NPC, place, handout, a stripped character sheet, and an SRD monster,
spell or condition fetched client-side from `/api/srd/*`). Casting prep reveals it.
Public-layer selections only on everything the token can reach, and the picture of
whatever is cast served from one id-less route. Size the screen for a laptop read
from across a table. Old encounter links must keep working. PR on a `claude/` branch;
CI green only.
