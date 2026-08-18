import { describe, expect, it } from 'vitest'

import {
  DOC_PAGE_OFFSET,
  docScreens,
  docTitle,
  libraryForPage,
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
})
