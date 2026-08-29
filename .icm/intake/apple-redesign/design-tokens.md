# Stub: Subtle-fantasy design tokens

- feature-slug: design-tokens
- sequence: 1 of 5
- depends-on: none
- priority: P1
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

Replace the stock zero-chroma shadcn tokens in `src/app/globals.css` with the
subtle-fantasy palette: warm parchment-tinted neutrals, a deep red primary,
gold/amber accent — full light *and* dark variants, tuned for phone screens.
Body type moves to the system font stack (renders SF on the iPhones this is used
on); headings get a display serif via `next/font`. Retire the design debt in
`src/app/page.tsx`: the hardcoded `from-amber-50…` gradient and literal per-tab
colours (`text-blue-600` etc.) become semantic tokens. Tokens only — no layout
changes in this stub.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/apple-redesign/design-tokens.md` and the epic's `breakdown.md`.
Rework the token layer in `src/app/globals.css` (Tailwind v4 CSS-first `@theme`,
shadcn CSS variables) to a subtle-fantasy palette — warm parchment neutrals, deep
red primary, restrained gold accent — with coherent light and dark values; check
contrast on phone screens. Switch body type to the system font stack and add one
display serif for headings via `next/font`. Then sweep `src/app/page.tsx` (and
any other literal-colour stragglers) onto semantic tokens, deleting the hardcoded
gradient and per-tab colours — the ux lens (2026-08-29) confirmed the sweep must
reach the sheet/encounter files too: `hit-points-card.tsx` (`text-amber-600`
bloodied, `text-sky-600` temp HP), `combatant-row.tsx`, `table-screen.tsx`
(`bg-emerald-500` bars), `death-saves-card.tsx` — dim-light contrast rides on
these. Do not change layout or components in this stub.
PR on a `claude/` branch; CI green only.
