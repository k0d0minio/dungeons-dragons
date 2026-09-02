# Stub: "What this means in play" on every option

- feature-slug: inline-consequences
- sequence: 3 of 5
- depends-on: wizard-frame
- priority: P1
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

Jamie's core aim: friends understand how their choices affect gameplay. Every
selectable option in the wizard — class, species, background, score assignment,
skill, spell, weapon — carries a one-line plain-language consequence: "you can
take a beating and hit hard", "this makes you harder to hit", "you can do this
twice, then you need a rest", "your fire bolt needs an attack roll; this one
forces them to dodge". Content is authored data alongside the SRD entries (an
`inPlay` string per option), written in the app's own words (mechanics aren't
copyrightable; don't copy non-SRD phrasing), rendered by one shared option-row
component.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/guided-creation/inline-consequences.md` and the epic's
`breakdown.md`. The wizard (`wizard-frame` stub) exists. Add an `inPlay`
plain-language consequence line to the local SRD 5.2.1 data entries used by the
wizard (classes, species, backgrounds, skills, the curated spell subset, weapon
groups), written fresh in the app's voice, and render it via a single shared
option-row component across all wizard steps. Cover every option the wizard can
show; a lint-style test should fail on an entry missing its line. PR on a
`claude/` branch; CI green only.
