// Markdown-to-JSX for the chapters served in-app — the SRD rules chapters
// under `docs/rules/` (DND-037, DND-053) and the learn-to-play pages under
// `docs/learn/` (`learn-to-play/learn-chapters`).
//
// Deliberately not a markdown library: the dependency would be heavier than
// the problem. This renders exactly the subset those files actually use —
//
//   - headings `#`..`###` (each gets a slugified `id`, so a condition heading
//     like "### Blinded" is linkable as `#blinded` — the sheet's ConditionsCard
//     relies on those anchors matching the dnd5eapi condition indexes)
//   - paragraphs
//   - blockquotes (`> …`, single-paragraph — the purpose notes and the
//     "changed from 2014" notes)
//   - unordered (`- `) and ordered (`1. `) lists of single-line items
//   - pipe tables with a `|---|` separator row
//   - fenced code blocks (the quick reference's formula block)
//   - inline `**bold**`, `*italic*`/`_italic_`, `***bold italic***` and
//     `` `code` ``, nestable — prettier rewrites emphasis to `_…_` in every
//     markdown file it is allowed to touch, and `docs/learn/` is one of them
//   - glossary tokens `[[index]]` / `[[index|words]]`, opt-in per document
//
// Anything outside that subset (links, images, nested lists, multi-paragraph
// list items, h4+) renders as literal text; extend this file if a chapter
// grows new syntax rather than reaching for a package.

import type { ReactNode } from 'react'

/**
 * Per-document rendering options.
 *
 * `term` is what turns a `[[bonus-action|bonus action]]` token into a tappable
 * definition. It is injected rather than imported because this module renders
 * both tiers: the `/rules` chapters are SRD text word-for-word and must never
 * gain a control the SRD did not write, so they simply pass nothing and the
 * token syntax stays inert for them.
 *
 * Nothing here knows what a glossary is — `src/components/learn/learn-chapter.tsx`
 * supplies the renderer — which keeps the component layer out of `src/lib`.
 */
export type MarkdownOptions = {
  /**
   * Called for each glossary token. `label` is the pipe half when the token
   * carries one. With no renderer the token is not a token at all: it falls
   * through as literal text, brackets and all, the same as every other syntax
   * this file does not implement. That is the right failure for the verbatim
   * tier — silently rewriting SRD prose that happened to contain `[[` would be
   * worse than showing it.
   */
  term?: (index: string, label: string | undefined, key: number) => ReactNode
}

/** GitHub-style heading slug: lowercase, alphanumerics kept, spaces to hyphens. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
}

/**
 * `[[index]]` or `[[index|the words as they read here]]`.
 *
 * The index half is slug-shaped on purpose: it can never contain a `|` or a
 * `]`, so a stray bracket in prose (`[[1]]`, a citation) fails to match and
 * survives to the page as itself.
 */
const GLOSSARY_TOKEN = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g

/** Strip inline markers so heading slugs come from the words alone. */
function plainText(text: string): string {
  return text
    .replace(GLOSSARY_TOKEN, (_match, index: string, label?: string) => label ?? index)
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}

// Code first, so an underscore or an asterisk inside `` `a_b` `` stays part of
// the code rather than opening an emphasis span.
const INLINE_TOKEN = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g

/** The same spans plus glossary tokens, for a document that opted in. */
const INLINE_TOKEN_WITH_TERMS =
  /(`[^`]+`|\[\[[a-z0-9-]+(?:\|[^\]]+)?\]\]|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g

/**
 * Bold, italic, code spans and glossary tokens; the rest passes through as text.
 *
 * Emphasis nests: `**a [[term|term]] b**` and `**_both_**` both work, because
 * the contents of a span go back through this function. It terminates because
 * every recursion drops the delimiters it matched, and a span's contents can
 * never contain the delimiter that opened it.
 */
export function renderInline(text: string, options: MarkdownOptions = {}): ReactNode {
  const parts = text.split(options.term ? INLINE_TOKEN_WITH_TERMS : INLINE_TOKEN)

  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      // Code is verbatim by definition — the one span that does not recurse.
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (options.term && part.startsWith('[[') && part.endsWith(']]')) {
      const [index, label] = part.slice(2, -2).split('|')
      // A term this build does not define is the component's problem, not
      // this one's: `GlossaryTerm` already falls back to the words alone.
      return options.term(index, label, i)
    }
    if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
      return (
        <strong key={i}>
          <em>{renderInline(part.slice(3, -3), options)}</em>
        </strong>
      )
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{renderInline(part.slice(2, -2), options)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{renderInline(part.slice(1, -1), options)}</em>
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return <em key={i}>{renderInline(part.slice(1, -1), options)}</em>
    }
    return part
  })
}

const PROSE_CLASS = 'text-sm leading-relaxed text-foreground'

function renderTable(lines: string[], key: number, options: MarkdownOptions): ReactNode {
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
                className="border-b-2 py-1.5 pr-4 text-left align-bottom font-semibold text-foreground"
              >
                {renderInline(cell, options)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((cells, r) => (
            <tr key={r}>
              {cells.map((cell, c) => (
                <td key={c} className="border-b py-1.5 pr-4 align-top text-foreground">
                  {renderInline(cell, options)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The whole document as a keyed array of block elements.
 *
 * `options` is per-document rather than global: the same renderer serves the
 * verbatim SRD chapters and the learn-to-play pages, and only the latter opt
 * into glossary tokens.
 */
export function renderMarkdown(markdown: string, options: MarkdownOptions = {}): ReactNode[] {
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
          className="overflow-x-auto rounded-lg border bg-muted p-3 font-mono text-xs leading-relaxed text-foreground"
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
      const content = renderInline(text, options)

      if (level === 1) {
        blocks.push(
          <h1 key={key++} id={id} className="text-2xl font-bold text-foreground">
            {content}
          </h1>,
        )
      } else if (level === 2) {
        blocks.push(
          <h2
            key={key++}
            id={id}
            className="mt-8 border-b pb-1 text-xl font-semibold text-foreground"
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
            className="mt-6 scroll-mt-16 text-lg font-semibold text-foreground"
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
          className="border-l-4 border-border pl-3 text-sm leading-relaxed text-muted-foreground"
        >
          {renderInline(quote.join(' '), options)}
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
      blocks.push(renderTable(table, key++, options))
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
            <li key={n}>{renderInline(item, options)}</li>
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
            <li key={n}>{renderInline(item, options)}</li>
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
        {renderInline(paragraph.join(' '), options)}
      </p>,
    )
  }

  return blocks
}
