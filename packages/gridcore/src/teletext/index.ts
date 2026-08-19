// Block graphics (existing)
export { createEmptyBlock2x3 } from './block2x3'
export type { Block2x3 } from './block2x3'
export { blockToPattern, calculateMosaicBlock, patternToBlock } from './mosaic'

// Teletext control codes + interpreter
export * from './control'

// Teletext surface (new)
export { DEFAULT_TELETEXT_COLS, DEFAULT_TELETEXT_ROWS, TeletextSurface } from './teletext-surface'
export type {
    FastTextLink, PageLoader, TeletextPage, TeletextSurfaceOptions
} from './teletext-surface'

// Reader teletext model (E1: extracted from UCodeSurface.vue)
// This is the Ceefax-style vault reader model (ReaderTeletextPage, builders, renderers)
export * from './reader-model'

// Page provider (new)
export { TeletextPageProvider } from './page-provider'
export type { CourseRegistry, FeedCourse, FeedLesson, VaultConfig } from './page-provider'

