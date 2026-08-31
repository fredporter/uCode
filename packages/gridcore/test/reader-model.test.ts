import { describe, expect, it } from 'vitest'

import {
  DOC_PAGE_OFFSET,
  docScreens,
  docTitle,
  DOCS_PER_LIST_PAGE,
  libraryForPage,
  teletextPlainText,
  teletextContent,
  type BuilderContext,
  type VaultDoc,
  type VaultLibrary,
} from '../src/teletext/reader-model'

const document: VaultDoc = {
  path: 'docs/hello.md',
  filename: 'hello-world.md',
  binder: null,
  tags: ['docs'],
  preview: 'Preview fallback',
  extension: 'md',
}

const library: VaultLibrary = {
  id: 'documentation',
  label: 'Documentation',
  source: 'public',
  tag: 'docs',
  page: 200,
  colour: 2,
  docs: [document],
}

function context(overrides: Partial<BuilderContext> = {}): BuilderContext {
  return {
    vaultLibraries: [library],
    vaultLoaded: true,
    vaultError: null,
    ...overrides,
  }
}

describe('reader teletext model', () => {
  it('normalizes document titles without host state', () => {
    expect(docTitle(document)).toBe('hello world')
  })

  it('uses cached document content before the preview fallback', () => {
    const cache = new Map([[document.path, 'Cached document body']])
    expect(docScreens(document, cache)).toEqual([['Cached document body']])
    expect(docScreens(document)).toEqual([['Preview fallback']])
  })

  it('keeps article subpages within the visible reader body', () => {
    const body = Array.from({ length: 14 }, (_, index) => `Line ${index + 1}`).join('\n')
    const screens = docScreens(document, new Map([[document.path, body]]))
    expect(screens).toHaveLength(2)
    expect(screens[0]).toHaveLength(13)
    const page = teletextContent(
      library.page + DOC_PAGE_OFFSET,
      context({ vaultDocCache: new Map([[document.path, body]]) }),
    )
    expect(page.lines).toHaveLength(17)
    expect(page.lines.at(-1)).toContain('Back: 200')
  })

  it('converts common Markdown into readable teletext text', () => {
    const markdown = `---\ntitle: Hidden\n---\n# Status **Update**\n\n- Read [the plan](https://example.test)\n- Run \`basic\`\n\n| Skill | Status |\n| --- | --- |\n| **Vault** | Ready |`
    expect(teletextPlainText(markdown)).toBe(
      'Status Update\n• Read the plan\n• Run basic\n\nSkill  Status\n\nVault  Ready',
    )
  })

  it('paginates document indexes to the visible two-line capacity', () => {
    expect(DOCS_PER_LIST_PAGE).toBe(7)
    const docs = Array.from({ length: 8 }, (_, index) => ({
      ...document,
      path: `docs/${index}.md`,
      filename: `document-${index}.md`,
    }))
    const first = teletextContent(200, context({
      vaultLibraries: [{ ...library, docs }],
    }))
    expect(first.lines.filter((line) => /^\s+2\d\d\s/.test(line))).toHaveLength(7)
    expect(first.lines.join('\n')).toContain('MORE')
  })

  it('maps a page to its library by hundred block', () => {
    expect(libraryForPage(250, [library])).toBe(library)
    expect(libraryForPage(888, [library])).toBeUndefined()
  })

  it('builds document pages exclusively from the supplied context', () => {
    const cache = new Map([[document.path, 'Full cached document']])
    const page = teletextContent(
      library.page + DOC_PAGE_OFFSET,
      context({ vaultDocCache: cache }),
    )

    expect(page.title).toBe('hello world')
    expect(page.lines).toContain('  Full cached document')
  })

  it('reports loading and unavailable states from context', () => {
    expect(
      teletextContent(100, context({ vaultLoaded: false })).lines.join(' '),
    ).toContain('Loading published content')
    expect(
      teletextContent(100, context({ vaultError: 'offline' })).lines.join(' '),
    ).toContain('Vault unavailable: offline')
  })

  it('exposes deterministic editorial reference pages', () => {
    expect([102, 103, 104].map((page) => teletextContent(page, context()).composition))
      .toEqual(['data', 'map', 'graphics'])
    expect(teletextContent(102, context()).lines).toMatchInlineSnapshot(`
      [
        "  GRIDCORE SIGNAL",
        "",
        "  TERMINAL ............. ONLINE",
        "  TELETEXT ............. ONLINE",
        "  VAULT ................. READY",
        "",
        "  ACTIVITY — LAST 7 CYCLES",
      ]
    `)
  })
})
