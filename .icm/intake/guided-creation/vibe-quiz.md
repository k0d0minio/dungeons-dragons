# Stub: The vibe quiz that recommends a build

- feature-slug: vibe-quiz
- sequence: 2 of 5
- depends-on: wizard-frame
- priority: P1
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-research.md §3

Before the wizard, an optional three-to-four-question quiz in plain language —
"fight up close, cast spells, sneak, or talk your way out?", "simple to run or
lots of options?", "protect the group or deal the damage?" — mapping to a full
recommended build (class, species, background, array assignment, skills, spells)
that pre-fills every wizard step. Hesitant/"keep it simple" answers steer to
Champion Fighter or Thief Rogue (research: lowest cognitive load). Skippable
straight into the wizard; re-runnable without losing a draft.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/guided-creation/vibe-quiz.md` and the epic's `breakdown.md`. The
wizard from the `wizard-frame` stub exists. Build the quiz as the wizard's
optional first screen: 3–4 plain-language questions, a deterministic mapping
table from answer combinations to a complete recommended build across all twelve
SRD 5.2.1 classes (every class reachable by some answer path; simplicity-leaning
paths land on Champion Fighter / Thief Rogue), and pre-fill of every wizard step
from the result with a short "why this fits" line. Skippable and re-runnable.
Unit-test the mapping. PR on a `claude/` branch; CI green only.
