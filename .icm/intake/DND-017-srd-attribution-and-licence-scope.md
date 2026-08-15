# DND-017 · SRD 5.1 attribution in the app, and scope the MIT licence

| | |
|---|---|
| Status | ready |
| Type | chore |
| Priority | P0 |
| Size | S |
| Sources | legal lens · `src/app/page.tsx:378` · `src/components/reference/spell-detail.tsx:53-62` · `docs/rules/README.md:69-78` · `LICENSE:5-13` · `README.md:116` |

## Problem

Two licensing gaps on a **public** deployment of a **public** repo. Neither is hypothetical
and both are cheap.

**1 — The app serves SRD text with no attribution.** The reference browser renders verbatim
SRD 5.1 content — spell descriptions, higher-level text, monster and equipment entries — to
anyone, with no sign-in. The only credit on screen is
`Powered by D&D 5e API • Built with Next.js 15, SWR, and shadcn/ui` (`src/app/page.tsx:378`),
which names the API, not Wizards of the Coast, not the SRD, and not the licence. Serving
that content publicly is "Sharing" under CC-BY 4.0 §3(a), which requires attribution at the
point of distribution. CC-BY 4.0 §6(a) terminates the licence automatically on breach,
curable within 30 days.

The correct attribution **already exists** at `docs/rules/README.md:69-78` — a folder the
README itself says nothing in `src/` renders. This is a copy-paste onto the app surface, not
a writing job.

While in that footer: CC-BY 4.0 §2(b)(2) does not license trademarks, and the app calls
itself "D&D 5e Companion" in its title and header (`src/app/layout.tsx:20,44`). WotC's Fan
Content Policy covers exactly this non-commercial use and asks for a "not affiliated with /
endorsed by Wizards of the Coast" line. Same footer, one more sentence.

**2 — The MIT licence appears to cover content Jamie does not own.** `LICENSE:5-13` grants
MIT over "the Software and associated documentation files" with a right to sublicense.
`docs/rules/` is eleven documentation files derived from CC-BY-4.0 SRD material — Jamie
cannot grant those terms. A downstream user following `LICENSE` at face value would strip
the SRD attribution (MIT only obliges preserving the copyright notice) and breach CC-BY
themselves. `README.md:116` says flatly "MIT — see LICENSE" with no carve-out.

This is not a licence conflict: CC-BY is not copyleft, and MIT code and CC-BY docs coexist
in one repo fine. It is purely a "say which covers what" fix.

## Acceptance

- [ ] The SRD 5.1 attribution renders on the app's own public surface, wherever reference
      content is served — not only in `docs/`
- [ ] Attribution names Wizards of the Coast, the SRD, and CC-BY-4.0, using WotC's own
      wording rather than a paraphrase
- [ ] A Fan Content Policy disclaimer ("not affiliated with / endorsed by Wizards of the
      Coast") appears alongside it
- [ ] `LICENSE` carries a scope line saying MIT covers the source code and does not cover
      `docs/rules/` or SRD content
- [ ] `README.md`'s Licence section matches
- [ ] CI green

## Prompt

Put the SRD 5.1 attribution on the D&D 5e Companion's own surface, and stop the MIT licence
appearing to cover content that is not Jamie's to license.

This app publicly serves verbatim SRD 5.1 text (see `src/components/reference/spell-detail.tsx:53-62`
and the other files in `src/components/reference/`), but the only credit anywhere on screen
is the footer at `src/app/page.tsx:378`, which names the D&D 5e API rather than Wizards of
the Coast, the SRD, or CC-BY-4.0. Under CC-BY 4.0 §3(a) that attribution is required at the
point of distribution.

The attribution text you need already exists, correctly written, at `docs/rules/README.md:69-78`
— use it rather than composing your own, and take the exact wording from WotC's SRD page
rather than paraphrasing. Put it somewhere it renders on every page that serves reference
content; the footer is the obvious home, but the footer currently only exists on the home
page, so check `src/app/layout.tsx` and decide where it genuinely belongs. Add a Fan Content
Policy disclaimer next to it — CC-BY does not license the "D&D" trademark the app uses in
its own name.

Then scope `LICENSE`: add a short section saying the MIT grant covers the source code and
explicitly does not cover `docs/rules/` or any SRD-derived content, which is CC-BY-4.0 and
carries its own attribution requirement. Match that in `README.md`'s Licence section.

Note while you are in `src/app/page.tsx:378`: that same footer string says "Next.js 15" and
the repo is on 16. Fixing it is DND-041's job, not yours — leave it, or you will collide
with that ticket's test change at `src/app/page.test.tsx:83`.

Read `.icm/intake/DND-017-srd-attribution-and-licence-scope.md` and `.icm/project.md` for
context. Open a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
