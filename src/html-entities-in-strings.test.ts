import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import * as ts from 'typescript'

// JSX *text* decodes HTML entities; a JS *string* does not. So
// `<p>Ava&rsquo;s level</p>` renders an apostrophe, while
// ``title={`Manage ${name}&rsquo;s level`}`` renders the six literal
// characters "&rsquo;" — which is what the level page shipped to production
// until `.icm/intake/triage/_done/level-page-title-entity.md`.
//
// The two shapes look identical in a diff, and the difference is invisible
// until the page is open in a browser, so this reads every source file with
// the TypeScript parser and fails on an entity inside a string or template
// literal. JsxText is a different node kind, so prose in markup — the vast
// majority of the entities in `src/` — is left alone.
const SRC = __dirname

/** Named (`&rsquo;`) and numeric (`&#8217;`, `&#x2019;`) HTML entities. */
const ENTITY = /&(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#\d{1,7}|#[xX][0-9a-fA-F]{1,6});/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    if (!/\.tsx?$/.test(entry.name)) return []
    if (/\.(test|spec)\.tsx?$/.test(entry.name)) return []
    return [path]
  })
}

/** Every string- and template-literal text in one file, with its line number. */
function stringLiterals(path: string): { line: number; text: string }[] {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const found: { line: number; text: string }[] = []

  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
      found.push({ line: line + 1, text: node.text })
    }
    ts.forEachChild(node, visit)
  }

  visit(source)
  return found
}

describe('HTML entities in source', () => {
  it('never appear inside a JS string, where nothing decodes them', () => {
    const offenders = sourceFiles(SRC).flatMap((path) =>
      stringLiterals(path)
        .filter(({ text }) => ENTITY.test(text))
        .map(({ line, text }) => `${path.slice(SRC.length + 1)}:${line}: ${text}`),
    )

    expect(offenders).toEqual([])
  })
})
