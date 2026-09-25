# Stub: Gentle party-balance hints

- feature-slug: party-balance-hints
- sequence: 5 of 5
- depends-on: vibe-quiz
- priority: P2
- size: S
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

With 5–6 friends creating characters for one campaign, the class step can offer a
soft composition nudge when the character is being made for a campaign the player
already joined: "your party of five has no one who can heal" / "three of you are
already sneaky". Informational only — never blocks, never shames a duplicate
class, easily dismissed. Skip entirely when no campaign context exists.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/guided-creation/party-balance-hints.md` and the epic's
`breakdown.md`. The wizard and quiz exist. When a creation flow starts from a
campaign join (or the player has exactly one campaign), fetch that campaign's
existing party classes and show at most one gentle, dismissible composition hint
on the class step, per the stub's tone. No hint outside campaign context. PR on a
`claude/` branch; CI green only.
