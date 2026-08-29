# Stub: The eleven rules chapters move to the 2024 baseline

- feature-slug: rules-chapters-2024
- sequence: 4 of 5
- depends-on: srd-data-layer
- priority: P1
- size: L
- sources: .icm/docs/2026-08-29-first-campaign-research.md §1–2

Rewrite `docs/rules/` (11 chapters, ~3,500 lines) from the SRD 5.1 baseline to
SRD 5.2.1. These files are double-duty (register decision D29): the AI's
implementation reference *and* the user-facing `/rules/*` pages — so accuracy
matters twice. Cover the 2024 action list, background-as-origin, species traits,
weapon mastery, new exhaustion, heroic inspiration, subclass-at-3. Only SRD 5.2.1
wording may be paraphrased into them. The friendlier beginner tier is NOT this —
that's the `learn-to-play` epic; these chapters stay the reference tier.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/srd-2024-migration/rules-chapters-2024.md`, the epic's
`breakdown.md`, and `docs/rules/README.md`. Rewrite the eleven chapters in
`docs/rules/` to the 2024 rules (SRD 5.2.1) — see
`.icm/docs/2026-08-29-first-campaign-research.md` §1 for the change list and §2
for what is legally includable. Preserve the loading/rendering *mechanics*
(`src/lib/rules/load.ts`, the markdown pipeline), but the `src/`-side 2014 copy IS
in scope: the chapter blurbs in `src/lib/rules/chapters.ts` ("Point buy, races…",
the 0–6 exhaustion framing, "CR and XP") and the "SRD 5.1 (2014)" intro on
`src/app/rules/page.tsx`. Keep chapter slugs stable unless a chapter's subject
disappears.
PR on a `claude/` branch; CI green only.
