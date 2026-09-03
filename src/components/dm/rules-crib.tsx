import { GlossaryTerm } from '@/components/glossary/glossary-term'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CRIB_SECTIONS, type CribBlock, type CribSection } from '@/lib/dm/crib'

/**
 * The DM's crib (`dm-run-suite/dm-rules-crib`) — the paper screen, rendered.
 *
 * Built for one interaction and no others: the DM has stopped mid-sentence,
 * six people are waiting, and the answer has to be on screen inside five
 * seconds. So there is **no search box** — typing loses to scrolling at this
 * length, and a search field on a phone opens a keyboard over the answer — and
 * nothing here is collapsed: every row is already on the page, and the jump
 * chips are only a shortcut past the scroll.
 *
 * A server component with client islands: nothing on this screen has state
 * except the glossary popovers, and the jump chips are plain fragment links,
 * so the whole crib is HTML that works before any JavaScript arrives.
 */
export function RulesCrib({
  sections = CRIB_SECTIONS,
}: {
  /** Overridable so tests can render a fixture rather than the whole crib. */
  sections?: readonly CribSection[]
}) {
  return (
    <div className="space-y-4">
      <CribJumpNav sections={sections} />

      {sections.map((section) => (
        <Card
          key={section.id}
          id={section.id}
          // Clears the sticky page header and the jump row above it, so a
          // chip tap lands on the heading rather than under the chrome.
          className="scroll-mt-40"
        >
          <CardHeader>
            <CardTitle asChild>
              <h2 className="font-serif text-lg font-bold">{section.title}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.blocks.map((block, index) => (
              <CribBlockView key={index} block={block} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * The chips at the top — the crib's whole navigation.
 *
 * Sticky under the page header rather than scrolling away: the second lookup
 * of a session starts from wherever the first one ended, and scrolling back
 * to the top to reach the other six stops is the thing that makes a digital
 * screen slower than the cardboard one.
 */
function CribJumpNav({ sections }: { sections: readonly CribSection[] }) {
  return (
    <nav
      aria-label="Jump to"
      className="bg-background/95 sticky top-24 z-20 -mx-4 border-b px-4 py-2 backdrop-blur"
    >
      <ul className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="hover:bg-accent focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              {section.chip}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function CribBlockView({ block }: { block: CribBlock }) {
  switch (block.kind) {
    case 'entries':
      return (
        <section>
          <BlockTitle>{block.title}</BlockTitle>
          {/* Label and answer share a line, the label leading in bold: at
              320px a two-column table gives the answer 150px and breaks every
              row into four lines, while a bolded lead-in still lets the eye
              run down the left edge looking for the one word it wants. */}
          <dl className="divide-border divide-y text-sm">
            {block.entries.map((entry) => (
              <div key={entry.label} className="py-2 first:pt-0 last:pb-0">
                <dt className="inline font-semibold">
                  {entry.term ? (
                    <GlossaryTerm index={entry.term}>{entry.label}</GlossaryTerm>
                  ) : (
                    entry.label
                  )}
                </dt>
                <dd className="inline"> — {entry.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      )

    case 'steps':
      return (
        <section>
          <BlockTitle>{block.title}</BlockTitle>
          <ol className="marker:text-muted-foreground list-decimal space-y-2 pl-5 text-sm marker:font-semibold">
            {block.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      )

    case 'ladder':
      return (
        <section>
          <BlockTitle>{block.title}</BlockTitle>
          {/* Three across rather than one scrolling row: six rungs on one line
              at 320px hides the hard end of the ladder off-screen, and the
              number you want most is as often 20 as it is 10. */}
          <ul className="grid grid-cols-3 gap-2">
            {block.rungs.map((rung) => (
              <li key={rung.value} className="bg-muted/50 rounded-lg border px-2 py-2 text-center">
                <span className="block text-xl font-bold tabular-nums">{rung.value}</span>
                <span className="text-muted-foreground block text-xs">{rung.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )

    case 'note':
      return (
        <p className="bg-muted/50 text-muted-foreground rounded-md px-3 py-2 text-sm">
          {block.text}
        </p>
      )
  }
}

/** The small caps heading over a block, rendered only when the block has one. */
function BlockTitle({ children }: { children?: string }) {
  if (!children) return null

  return (
    <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
      {children}
    </h3>
  )
}
