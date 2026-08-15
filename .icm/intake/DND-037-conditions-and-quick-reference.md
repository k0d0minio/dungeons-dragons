# DND-037 · Surface conditions and the quick reference in-app

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P2 |
| Size | S |
| Sources | market lens · product lens · `docs/rules/07-conditions.md` · `docs/rules/11-quick-reference.md` · `docs/rules/README.md:6-7` · `src/lib/characters/rules.ts:239-315` |

## Problem

`docs/rules/` holds 3,517 lines of SRD 5.1 reference — eleven chapters including a
purpose-written DM screen — and its own README says at `:6-7` that nothing in `src/` renders it.
It is readable only on GitHub. Meanwhile the reference browser proxies dnd5eapi.co, which serves
spells, monsters and equipment but **not rules prose**: there is no API route that answers "what
does restrained actually do".

The gap shows up in the app already. `src/lib/characters/rules.ts:239-315` duplicates
short summaries of all 15 conditions, and the only place they surface is the sheet's
`ConditionsCard` — for a signed-in character's *currently active* conditions. A DM asking "what
does frightened do" has no route at all.

**Scope this down hard.** "Surface the SRD reference in-app" sounds like eleven chapters and a
navigation tree; the market lens is clear that the only rules lookup that happens *mid-turn* is
conditions and the core combat actions. Those are two of the eleven files:
`docs/rules/07-conditions.md` and `docs/rules/11-quick-reference.md` — and the latter is
explicitly written as a DM screen "for mid-session lookups". Ship those two. The other nine are
between-sessions reading that GitHub already serves adequately.

Note `docs/rules/README.md` names an "AI wizard/assistant" as its consumer four times. Intent has
never asked for one; the content is a genuine asset as a rules source and as a human DM screen,
and that framing is not a commitment.

## Acceptance

- [ ] Condition rules text is readable in-app, without needing a character or a sign-in
- [ ] The quick-reference / combat-actions content is reachable in one or two taps mid-session
- [ ] Tapping a condition on the sheet's `ConditionsCard` reaches its full text
- [ ] The 15 condition summaries are not maintained in two places
- [ ] The other nine chapters are explicitly out of scope, and the ticket says so
- [ ] CI green

## Prompt

Surface the two SRD chapters that get read mid-session in the D&D 5e Companion — conditions and
the quick reference. Not all eleven.

`docs/rules/` holds 3,517 lines of SRD 5.1 content that nothing in `src/` renders (its README
says so at `:6-7`), and the dnd5eapi.co proxy does not serve rules prose — so there is currently
no way in the app to answer "what does restrained do". `docs/rules/07-conditions.md` and
`docs/rules/11-quick-reference.md` are the two that matter at the table; the latter is explicitly
written as a mid-session DM screen. **Leave the other nine on GitHub** — they are
between-sessions reading, and building navigation for all eleven is a much larger ticket for
much less value.

Decide how the markdown reaches the app. It is checked into the repo, so build-time import or a
static route is likely simpler and faster than anything dynamic — and it makes rules lookup work
in a signal blackspot, which the API-backed reference never will.

Connect it to what already exists: `src/lib/characters/rules.ts:239-315` holds short summaries of
all 15 conditions, currently surfaced only by the sheet's `ConditionsCard` for *active*
conditions. Tapping a condition there should reach its full text. Do not end up maintaining
condition text in two places — either the card reads from the chapter, or the summaries stay and
the chapter is clearly the long form.

This is public reference content, so it should not require a sign-in, matching the existing
reference browser. It needs a home in the navigation from DND-029.

Read `.icm/intake/DND-037-conditions-and-quick-reference.md` and `.icm/project.md` for context.
Open a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
