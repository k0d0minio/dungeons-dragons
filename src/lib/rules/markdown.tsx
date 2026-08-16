// Markdown-to-JSX for the two SRD rules chapters served in-app (DND-037).
//
// Deliberately not a markdown library: the dependency would be heavier than
// the problem. This renders exactly the subset `docs/rules/07-conditions.md`
// and `docs/rules/11-quick-reference.md` actually use —
//
//   - headings `#`..`###` (each gets a slugified `id`, so a condition heading
//     like "### Blinded" is linkable as `#blinded` — the sheet's ConditionsCard
//     relies on those anchors matching the dnd5eapi condition indexes)
//   - paragraphs
//   - blockquotes (`> …`, single-paragraph — the purpose notes and 2024 notes)
//   - unordered (`- `) and ordered (`1. `) lists of single-line items
//   - pipe tables with a `|---|` separator row
//   - fenced code blocks (the quick reference's formula block)
//   - inline `**bold**`, `*italic*`, `***bold italic***` and `` `code` ``
//
// Anything outside that subset (links, images, nested lists, multi-paragraph
// list items, h4+) renders as literal text; extend this file if a chapter
// grows new syntax rather than reaching for a package.

import type { ReactNode } from 'react'

/** GitHub-style heading slug: lowercase, alphanumerics kept, spaces to hyphens. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
}

/** Strip inline markers so heading slugs come from the words alone. */
function plainText(text: string): string {
  return text.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1').replace(/`([^`]+)`/g, '$1')
}

const INLINE_TOKEN = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g

/** Bold, italic and code spans; everything else passes through as text. */
export function renderInline(text: string): ReactNode {
  const parts = text.split(INLINE_TOKEN)

  return parts.map((part, i) => {
    if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
      return (
        <strong key={i}>
          <em>{part.slice(3, -3)}</em>
        </strong>
      )
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="rounded bg-gray-100 px-1 py-0.5 font-mono dark:bg-gray-800">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

const PROSE_CLASS = 'text-sm leading-relaxed text-gray-700 dark:text-gray-300'

function renderTable(lines: string[], key: number): ReactNode {
  const rows = lines.map((line) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim()),
  )
  const [header, ...body] = rows
  // Drop the |---|---| separator row.
  const bodyRows = body.filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell)))

  return (
    // Some of the quick-reference tables (spell slots, ability modifiers) are
    // wider than any phone; they scroll inside their own box rather than
    // putting the page into horizontal scroll.
    <div key={key} className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                className="border-b-2 py-1.5 pr-4 text-left align-bottom font-semibold text-gray-900 dark:text-white"
              >
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((cells, r) => (
            <tr key={r}>
              {cells.map((cell, c) => (
                <td
                  key={c}
                  className="border-b py-1.5 pr-4 align-top text-gray-700 dark:text-gray-300"
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The whole document as a keyed array of block elements. */
export function renderMarkdown(markdown: string): ReactNode[] {
  const lines = markdown.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i += 1
      continue
    }

    // Fenced code block.
    if (trimmed.startsWith('```')) {
      const code: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i])
        i += 1
      }
      i += 1 // closing fence
      blocks.push(
        <pre
          key={key++}
          className="overflow-x-auto rounded-lg border bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-700 dark:bg-gray-800/50 dark:text-gray-300"
        >
          <code>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }

    // Headings.
    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed)
    if (heading) {
      const level = heading[1].length
      const text = heading[2]
      const id = slugifyHeading(plainText(text))
      const content = renderInline(text)

      if (level === 1) {
        blocks.push(
          <h1 key={key++} id={id} className="text-2xl font-bold text-gray-900 dark:text-white">
            {content}
          </h1>,
        )
      } else if (level === 2) {
        blocks.push(
          <h2
            key={key++}
            id={id}
            className="mt-8 border-b pb-1 text-xl font-semibold text-gray-900 dark:text-white"
          >
            {content}
          </h2>,
        )
      } else {
        blocks.push(
          // `scroll-mt-16` keeps an anchor target clear of the sticky-ish top
          // of the viewport when the ConditionsCard links land on it.
          <h3
            key={key++}
            id={id}
            className="mt-6 scroll-mt-16 text-lg font-semibold text-gray-900 dark:text-white"
          >
            {content}
          </h3>,
        )
      }
      i += 1
      continue
    }

    // Blockquote.
    if (trimmed.startsWith('>')) {
      const quote: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''))
        i += 1
      }
      blocks.push(
        <blockquote
          key={key++}
          className="border-l-4 border-gray-300 pl-3 text-sm leading-relaxed text-gray-600 dark:border-gray-600 dark:text-gray-400"
        >
          {renderInline(quote.join(' '))}
        </blockquote>,
      )
      continue
    }

    // Table.
    if (trimmed.startsWith('|')) {
      const table: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        table.push(lines[i].trim())
        i += 1
      }
      blocks.push(renderTable(table, key++))
      continue
    }

    // Unordered list.
    if (/^-\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^-\s+/, ''))
        i += 1
      }
      blocks.push(
        <ul key={key++} className={`list-disc space-y-1 pl-5 ${PROSE_CLASS}`}>
          {items.map((item, n) => (
            <li key={n}>{renderInline(item)}</li>
          ))}
        </ul>,
      )
      continue
    }

    // Ordered list — `start` preserved so "20 fast answers" numbers honestly.
    const ordered = /^(\d+)\.\s+/.exec(trimmed)
    if (ordered) {
      const items: string[] = []
      const start = Number(ordered[1])
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i += 1
      }
      blocks.push(
        <ol key={key++} start={start} className={`list-decimal space-y-1 pl-5 ${PROSE_CLASS}`}>
          {items.map((item, n) => (
            <li key={n}>{renderInline(item)}</li>
          ))}
        </ol>,
      )
      continue
    }

    // Paragraph: consecutive non-blank, non-block lines.
    const paragraph: string[] = [trimmed]
    i += 1
    while (i < lines.length) {
      const next = lines[i].trim()
      if (!next || /^(#{1,3}\s|[->|]|\d+\.\s|```)/.test(next)) break
      paragraph.push(next)
      i += 1
    }
    blocks.push(
      <p key={key++} className={PROSE_CLASS}>
        {renderInline(paragraph.join(' '))}
      </p>,
    )
  }

  return blocks
}
