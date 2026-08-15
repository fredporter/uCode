// Block graphics (existing)
export { createEmptyBlock2x3 } from './block2x3'
export type { Block2x3 } from './block2x3'
export { calculateMosaicBlock, patternToBlock, blockToPattern } from './mosaic'

// Teletext control codes + interpreter
export * from './control'

// Teletext surface (new)
export { TeletextSurface, DEFAULT_TELETEXT_COLS, DEFAULT_TELETEXT_ROWS } from './teletext-surface'
export type {
  TeletextPage,
  FastTextLink,
  TeletextSurfaceOptions,
  PageLoader,
} from './teletext-surface'

// Page provider (new)
export { TeletextPageProvider } from './page-provider'
export type { FeedLesson, FeedCourse, CourseRegistry, VaultConfig } from './page-provider'
