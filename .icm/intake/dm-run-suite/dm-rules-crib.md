# Stub: The DM rules crib

- feature-slug: dm-rules-crib
- sequence: 4 of 6
- depends-on: none
- priority: P2
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

The paper DM screen, digitized and DM-gated: one fast screen with the tables a
new DM reaches for mid-ruling — conditions at a glance, cover bonuses,
improvised DC ladder (easy 10 / moderate 15 / hard 20), light and vision,
travel pace, common actions, "someone hit 0 HP" steps, and a short
what-to-do-when list (player asks to try something odd → pick an ability +
DC). All 2024-baseline, all original wording, glossary popovers for depth.
Reachable in one tap from the DM tab and from inside an encounter.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-run-suite/dm-rules-crib.md` and the epic's `breakdown.md`.
Build the DM-gated crib screen described in the stub as structured local
content (not markdown prose — scannable tables/cards), on the 2024 rules
baseline in original wording, using glossary popovers where they exist. Link
it from the DM landing screen and the encounter tracker header. Optimize for
five-second mid-session lookups: search-less, thumb-scannable, grouped by
situation. PR on a `claude/` branch; CI green only.
