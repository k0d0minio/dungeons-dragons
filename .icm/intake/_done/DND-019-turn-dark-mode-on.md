# DND-019 · Turn dark mode on, and delete the config file that pretends to control it

| | |
|---|---|
| Status | ready |
| Type | bug |
| Priority | P1 |
| Size | S |
| Sources | ux lens · tech lens · `src/app/globals.css:8,52` · `src/app/layout.tsx:37` · `src/app/providers.tsx:22-31` · `tailwind.config.ts:2` · `components.json` |

## Problem

The app is locked to a pure-white background, and the project's stated constraint is that it
must be readable **in dim light, at a table**.

`next-themes` is a dependency, 18 files carry `dark:` variants, and `src/components/ui/sonner.tsx`
calls `useTheme` — but nothing ever puts a `.dark` class on `<html>`. There is no
`ThemeProvider` anywhere: `src/app/providers.tsx:22-31` mounts only the Neon Auth provider,
and `src/app/layout.tsx:37` renders a bare `<html lang="en">` with no class and no
`suppressHydrationWarning`. The dark variant is class-gated
(`globals.css:8` — `@custom-variant dark (&:is(.dark *))`), so system dark mode does nothing
either. Every `dark:` class in the repo is dead code, and `--background` is
`oklch(1 0 0)` — pure white (`globals.css:52`).

**There is a trap here, and it will bite whoever picks this up.** `tailwind.config.ts` looks
like the file that controls theming. It is inert: Tailwind v4 only reads a config when
`globals.css` has an `@config` directive, and it does not — `globals.css:1` is a bare
`@import "tailwindcss"`. `components.json` already records `"tailwind": {"config": ""}`.
Worse, the config's colours are written `hsl(var(--border))` while the CSS variables hold
`oklch(...)` values, so `hsl(oklch(...))` is invalid. **Adding `@config` to "fix" theming
would blank every colour in the app.** Delete the file rather than wire it up. Its only
importer, `tailwindcss-animate`, is itself dead — v4 uses `tw-animate-css`, which is what
`globals.css:6` actually imports.

## Acceptance

- [ ] Dark mode renders — the `dark:` variants that already exist across 18 files take effect
- [ ] The dark palette is legible at a table: check real contrast on the sheet's densest
      labels, not just the body text
- [ ] `tailwind.config.ts` is deleted, not wired up
- [ ] `tailwindcss-animate` is removed from `package.json`
- [ ] `<Toaster />` mounting is left to DND-023 — do not add it here beyond what `next-themes` needs
- [ ] CI green

## Prompt

Turn dark mode on in the D&D 5e Companion. It is a phone app used at a table in dim light and
it currently renders pure white, because nothing ever applies the `.dark` class.

`next-themes` is installed and 18 files already have `dark:` variants written, but there is no
`ThemeProvider`: `src/app/providers.tsx` mounts only the Neon Auth provider, and
`src/app/layout.tsx:37` is a bare `<html lang="en">`. Add the provider, add
`suppressHydrationWarning` to `<html>`, and confirm the dark palette in `src/app/globals.css`
is actually legible — the sheet's densest labels are `text-[0.65rem]` in `--muted-foreground`,
so check those specifically rather than assuming the generated shadcn palette is fine.

Jamie's preference between system-following, dark-only and a manual toggle is not yet
recorded. Default to **following the system** — it is the smallest change and needs no header
real estate, which matters because DND-029 is about to rebuild navigation. If you add a
toggle, it must not conflict with that.

**Do not add an `@config` directive to `globals.css`.** `tailwind.config.ts` is inert under
Tailwind v4 and its colours are written `hsl(var(--border))` while the variables hold
`oklch(...)`, so wiring it up would produce `hsl(oklch(...))` and blank every colour in the
app. Delete `tailwind.config.ts` instead, and drop `tailwindcss-animate` from `package.json`
— it is the config's only consumer and v4 uses `tw-animate-css`, which `globals.css` already
imports.

Read `.icm/intake/DND-019-turn-dark-mode-on.md` and `.icm/project.md` for context. Open a PR
on a `claude/` branch; do not run local checks — CI is the source of truth.
