import type { TeletextPage, PageLoader } from './teletext-surface'

// ── Types ─────────────────────────────────────────────────────────

export interface FeedLesson {
  file: string
  title: string
  completeness: number
  level: string
  relevance: number
  topics: string[]
  notes?: string
}

export interface FeedCourse {
  name: string
  description: string
  lessons: FeedLesson[]
}

export interface CourseRegistry {
  version: string
  description: string
  updated: string
  courses: Record<string, FeedLesson[]>
  summary?: Record<string, unknown>
}

export interface VaultConfig {
  vault: {
    path: string
    variables: Record<string, { description: string; file: string | null; examples: string[] }>
    secrets: { description: string; store: string; keys: string[] }
    programs: { path: string; description: string }
    snacks: { path: string; description: string }
    stories: { path: string; description: string }
    assets: { path: string; subdirs: string[] }
    config: { path: string; files: string[] }
  }
}

// ── Default Content (inline, no external deps) ────────────────────

function defaultVaultConfig(): VaultConfig {
  return {
    vault: {
      path: '~/.local/share/udos/Vault/',
      variables: {
        user: { description: 'User-level variables (persistent)', file: 'variables/user.yaml', examples: ['theme: dark', 'editor_font_size: 14'] },
        global: { description: 'System-wide variables', file: 'variables/global.yaml', examples: ['runtime_version: 2.0'] },
        snack: { description: 'Per-snack container state', file: null, examples: ['level: 3'] },
        system: { description: 'Runtime-only state (not persisted)', file: null, examples: [] },
      },
      secrets: { description: 'Sensitive values (API keys, tokens)', store: 'macOS Keychain / file-encrypted', keys: ['OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GITHUB_TOKEN'] },
      programs: { path: '~/.local/share/udos/programs/', description: 'User .ucode scripts' },
      snacks: { path: '~/.local/share/udos/snacks/', description: 'Self-contained program + assets bundles' },
      stories: { path: '~/.local/share/udos/stories/', description: 'Marp story forms' },
      assets: { path: '~/.local/share/udos/assets/', subdirs: ['sprites', 'bobs', 'sounds', 'maps'] },
      config: { path: '~/.local/share/udos/.config/', files: ['ucode.yaml', 'skins/classic.yaml', 'skins/dark.yaml', 'skins/retro.yaml'] },
    },
  }
}

function defaultRegistry(): CourseRegistry {
  return {
    version: '1.0.0',
    description: 'Course Registry — rated inventory of all uCode docs/ content',
    updated: '2026-07-01T21:20:00Z',
    courses: {
      basic: [
        { file: 'UCODE1_USER_GUIDE.md', title: 'uCode1 BASIC User Guide', completeness: 90, level: 'beginner', relevance: 100, topics: ['BBC BASIC', 'MODE 7', 'teletext', 'graphics', 'CLI'], notes: 'Comprehensive user guide' },
        { file: 'CHARACTER_SET_REFERENCE.md', title: 'Character Set Reference', completeness: 85, level: 'beginner', relevance: 95, topics: ['characters', '128 collection'] },
        { file: 'SPRITE_OBJECT_REFERENCE.md', title: 'Sprite and BOB Object Reference', completeness: 80, level: 'average', relevance: 95, topics: ['sprites', 'BOBs', 'animation'] },
        { file: 'CLI_README.md', title: 'CLI Overview', completeness: 75, level: 'beginner', relevance: 95, topics: ['CLI', 'commands'] },
        { file: 'CLI_COMMANDS.md', title: 'CLI Command Reference', completeness: 80, level: 'beginner', relevance: 95, topics: ['CLI', 'commands', 'reference'] },
        { file: 'QUICK_START.md', title: 'uCode BASIC Quick Start', completeness: 85, level: 'beginner', relevance: 100, topics: ['BBC BASIC', 'quick start'] },
      ],
      gridcore: [
        { file: 'GRID_ALGEBRA_COLUMN_SPECS.md', title: 'Grid Algebra Column Specs', completeness: 95, level: 'advanced', relevance: 100, topics: ['grid algebra', 'columns'] },
        { file: 'HANDOVER_UCODE_GRIDSMITH_BUILDOUT.md', title: 'GridSmith Buildout Handover', completeness: 75, level: 'average', relevance: 90, topics: ['gridsmith', 'buildout'] },
      ],
      spatial: [
        { file: 'UDOS_SPATIAL_ALGEBRA_LOCKED_v1.2.md', title: 'Spatial Algebra Locked Spec v1.2', completeness: 95, level: 'advanced', relevance: 100, topics: ['spatial algebra'] },
        { file: 'UDOS_UCELL_VOXEL_MAPPING_v1.md', title: 'uCell Voxel Mapping v1', completeness: 90, level: 'advanced', relevance: 100, topics: ['ucell', 'voxel'] },
      ],
      tutorials: [
        { file: 'lesson_01.md', title: 'Lesson 1: uCode Basics', completeness: 85, level: 'beginner', relevance: 100, topics: ['BBC BASIC', 'hello world'] },
        { file: 'lesson_02.md', title: 'Lesson 2: Text and Graphics', completeness: 80, level: 'beginner', relevance: 100, topics: ['text', 'graphics'] },
        { file: 'ucode-mini-game.md', title: 'Mini-Game Learning Pathway', completeness: 70, level: 'average', relevance: 100, topics: ['mini-game'] },
      ],
      'top-level': [
        { file: 'UCODE_STUDENT_PATHWAY.md', title: 'Student Pathway v2', completeness: 90, level: 'beginner', relevance: 100, topics: ['student', 'pathway'] },
        { file: 'UCODE_RUNTIME_SPEC.md', title: 'Runtime Specification v2', completeness: 95, level: 'advanced', relevance: 100, topics: ['runtime', 'BBCSDL'] },
        { file: 'GRIDSMITH_DEV_PLAN.md', title: 'GridSmith Dev Plan', completeness: 85, level: 'advanced', relevance: 100, topics: ['gridsmith', 'dev plan'] },
        { file: 'INTEGRATION.md', title: 'Integration Reference', completeness: 80, level: 'average', relevance: 100, topics: ['integration'] },
      ],
    },
  }
}

// ── Page Provider ─────────────────────────────────────────────────

export class TeletextPageProvider {
  private vaultConfig: VaultConfig
  private courseRegistry: CourseRegistry

  constructor(vaultConfig?: VaultConfig, courseRegistry?: CourseRegistry) {
    this.vaultConfig = vaultConfig ?? defaultVaultConfig()
    this.courseRegistry = courseRegistry ?? defaultRegistry()
  }

  /** Create a PageLoader function that resolves page numbers */
  createPageLoader(): PageLoader {
    return (pageNumber: number): TeletextPage => {
      return this.resolvePage(pageNumber)
    }
  }

  /** Resolve a page number to its content */
  resolvePage(pageNumber: number): TeletextPage {
    // Main index — page 100
    if (pageNumber === 100) return this.buildIndexPage()

    // News headlines — 101
    if (pageNumber === 101) return this.buildNewsPage()

    // Course catalogue — 300
    if (pageNumber === 300) return this.buildCourseIndexPage()
    // Individual courses — 301-310
    if (pageNumber >= 301 && pageNumber <= 310) return this.buildCoursePage(pageNumber - 301)

    // Vault — 400
    if (pageNumber === 400) return this.buildVaultIndexPage()
    // Vault detail — 401-410
    if (pageNumber >= 401 && pageNumber <= 410) return this.buildVaultDetailPage(pageNumber - 401)

    // Documentation — 500
    if (pageNumber === 500) return this.buildDocsIndexPage()
    // Docs by category — 501-510
    if (pageNumber >= 501 && pageNumber <= 510) return this.buildDocCategoryPage(pageNumber - 501)

    // Help — 888
    if (pageNumber === 888) return this.buildHelpPage()

    // Index — 199
    if (pageNumber === 199) return this.buildSubIndexPage()

    // Unknown page
    return this.buildNotFoundPage(pageNumber)
  }

  // ── Page builders ───────────────────────────────────────────────

  private buildIndexPage(): TeletextPage {
    return {
      page: 100,
      title: 'uCode Main Index',
      date: new Date().toISOString().slice(0, 10),
      header: 'uCode CEEFAX 100  Main Index',
      content: [
        '    uCODE TELETEXT READER',
        '',
        '  NEWS HEADLINES .......... 101',
        '  COURSE CATALOGUE ........ 300',
        '  VAULT CONFIG ............ 400',
        '  DOCUMENTATION ........... 500',
        '',
        '  HELP & ABOUT ............. 888',
        '  INDEX .................... 199',
      ],
      fasttext: [
        { color: 'red', label: 'News', page: 101 },
        { color: 'green', label: 'Courses', page: 300 },
        { color: 'yellow', label: 'Vault', page: 400 },
        { color: 'cyan', label: 'Docs', page: 500 },
      ],
    }
  }

  private buildNewsPage(): TeletextPage {
    return {
      page: 101,
      title: 'uCode News',
      date: new Date().toISOString().slice(0, 10),
      header: 'uCode CEEFAX 101  News Headlines',
      content: [
        '    uCODE NEWS HEADLINES',
        '',
        '  Terminal + Teletext surfaces',
        '  wired to uCode runtime OK>',
        '  prompt. Vault, doc-sites, and',
        '  User Feeds available via',
        '  CEEFAX numeric navigation.',
        '',
        '  GridSmith Agent v0.2.0 with',
        '  6 workflow skills available.',
        '  BBCSDL engine bridge mock',
        '  mode operational.',
      ],
      fasttext: [
        { color: 'red', label: 'Main', page: 100 },
        { color: 'green', label: 'Courses', page: 300 },
        { color: 'yellow', label: 'Vault', page: 400 },
        { color: 'cyan', label: 'Docs', page: 500 },
      ],
    }
  }

  private buildCourseIndexPage(): TeletextPage {
    const categories = Object.keys(this.courseRegistry.courses)
    const lines: string[] = [
      '    COURSE CATALOGUE',
      '',
    ]
    let pageNum = 301
    for (const cat of categories) {
      const lessons = this.courseRegistry.courses[cat] ?? []
      lines.push(`  ${cat.toUpperCase()} (${lessons.length} docs) .... ${pageNum}`)
      pageNum++
    }
    lines.push('')
    lines.push('  Press page number for details')

    return {
      page: 300,
      title: 'Course Catalogue',
      date: this.courseRegistry.updated?.slice(0, 10) ?? '',
      header: 'uCode CEEFAX 300  Course Catalogue',
      content: lines,
      fasttext: [
        { color: 'red', label: 'Main', page: 100 },
        { color: 'green', label: 'News', page: 101 },
        { color: 'yellow', label: 'Vault', page: 400 },
        { color: 'cyan', label: 'Docs', page: 500 },
      ],
    }
  }

  private buildCoursePage(index: number): TeletextPage {
    const categories = Object.keys(this.courseRegistry.courses)
    if (index >= categories.length) {
      return this.buildNotFoundPage(301 + index)
    }

    const cat = categories[index]
    const lessons = this.courseRegistry.courses[cat] ?? []
    const lines: string[] = [
      `    ${cat.toUpperCase()} DOCUMENTS`,
      '',
    ]
    let count = 0
    for (const l of lessons) {
      if (count >= 18) break
      const prefix = count < 9 ? ` ${count + 1}` : `${count + 1}`
      lines.push(`  ${prefix}. ${l.title.slice(0, 32)}`)
      lines.push(`     [${l.level}] ${l.topics.join(', ').slice(0, 30)}`)
      count++
    }

    return {
      page: 301 + index,
      title: `${cat} Documents`,
      date: '',
      header: `uCode CEEFAX ${301 + index}  ${cat} Docs`,
      content: lines,
      fasttext: [
        { color: 'red', label: 'Courses', page: 300 },
        { color: 'green', label: 'Main', page: 100 },
        { color: 'yellow', label: 'Vault', page: 400 },
        { color: 'cyan', label: 'Docs', page: 500 },
      ],
    }
  }

  private buildVaultIndexPage(): TeletextPage {
    const vault = this.vaultConfig.vault
    const lines: string[] = [
      '    VAULT CONFIGURATION',
      '',
      `  Path: ${vault.path}`,
      '',
    ]

    // Variable sections
    lines.push('  VARIABLES:')
    for (const [key, section] of Object.entries(vault.variables)) {
      lines.push(`    ${key}: ${section.description.slice(0, 30)}`)
    }

    lines.push('')
    lines.push(`  SECRETS: ${vault.secrets.keys.length} keys stored in ${vault.secrets.store}`)

    lines.push('')
    lines.push('  Press 401 for secret details')

    return {
      page: 400,
      title: 'Vault Configuration',
      date: new Date().toISOString().slice(0, 10),
      header: 'uCode CEEFAX 400  Vault Config',
      content: lines,
      fasttext: [
        { color: 'red', label: 'Main', page: 100 },
        { color: 'green', label: 'Secrets', page: 401 },
        { color: 'yellow', label: 'Courses', page: 300 },
        { color: 'cyan', label: 'Docs', page: 500 },
      ],
    }
  }

  private buildVaultDetailPage(index: number): TeletextPage {
    if (index === 0) {
      // Secrets detail
      const vault = this.vaultConfig.vault
      const lines: string[] = [
        '    VAULT SECRETS',
        '',
        `  Store: ${vault.secrets.store}`,
        '',
      ]
      for (const key of vault.secrets.keys) {
        lines.push(`  ${key}: [SET]`)
      }
      lines.push('')
      lines.push('  Values never displayed here.')

      return {
        page: 401,
        title: 'Vault Secrets',
        date: '',
        header: 'uCode CEEFAX 401  Vault Secrets',
        content: lines,
        fasttext: [
          { color: 'red', label: 'Back', page: 400 },
          { color: 'green', label: 'Main', page: 100 },
          { color: 'yellow', label: 'Courses', page: 300 },
          { color: 'cyan', label: 'Docs', page: 500 },
        ],
      }
    }

    return this.buildNotFoundPage(401 + index)
  }

  private buildDocsIndexPage(): TeletextPage {
    const lines: string[] = [
      '    DOCUMENTATION INDEX',
      '',
      '  BASIC Runtime Docs ..... 501',
      '  GridCore Docs ........... 502',
      '  Spatial Algebra Docs .... 503',
      '  Tutorials ............... 504',
      '  Top-Level Docs ........... 505',
      '',
      '  Press page number for listing',
    ]

    return {
      page: 500,
      title: 'Documentation Index',
      date: new Date().toISOString().slice(0, 10),
      header: 'uCode CEEFAX 500  Documentation',
      content: lines,
      fasttext: [
        { color: 'red', label: 'Main', page: 100 },
        { color: 'green', label: 'Courses', page: 300 },
        { color: 'yellow', label: 'Vault', page: 400 },
        { color: 'cyan', label: 'Help', page: 888 },
      ],
    }
  }

  private buildDocCategoryPage(index: number): TeletextPage {
    const categories = Object.keys(this.courseRegistry.courses)
    if (index >= categories.length) return this.buildNotFoundPage(501 + index)

    const cat = categories[index]
    const lessons = this.courseRegistry.courses[cat] ?? []
    const lines: string[] = [
      `    ${cat.toUpperCase()} DOCS (${lessons.length} files)`,
      '',
    ]
    for (let i = 0; i < Math.min(lessons.length, 18); i++) {
      lines.push(`  * ${lessons[i].title.slice(0, 35)}`)
    }

    return {
      page: 501 + index,
      title: `${cat} Docs`,
      date: '',
      header: `uCode CEEFAX ${501 + index}  ${cat} Docs`,
      content: lines,
      fasttext: [
        { color: 'red', label: 'Docs', page: 500 },
        { color: 'green', label: 'Main', page: 100 },
        { color: 'yellow', label: 'Vault', page: 400 },
        { color: 'cyan', label: 'Help', page: 888 },
      ],
    }
  }

  private buildHelpPage(): TeletextPage {
    return {
      page: 888,
      title: 'Help & About',
      date: new Date().toISOString().slice(0, 10),
      header: 'uCode CEEFAX 888  Help',
      content: [
        '    HELP & ABOUT uCode',
        '',
        '  uCode v2.0 — Retro Computing',
        '  Education Platform',
        '',
        '  Type OK> HELP for commands',
        '  Type OK> CEEFAX for this reader',
        '',
        '  Number keys 0-9 navigate pages',
        '  ESC returns to Terminal',
        '',
        '  Main Index .............. 100',
        '  Course Catalogue ........ 300',
        '  Vault Config ............ 400',
        '  Documentation ........... 500',
      ],
      fasttext: [
        { color: 'red', label: 'Main', page: 100 },
        { color: 'green', label: 'Courses', page: 300 },
        { color: 'yellow', label: 'Vault', page: 400 },
        { color: 'cyan', label: 'Docs', page: 500 },
      ],
    }
  }

  private buildSubIndexPage(): TeletextPage {
    return {
      page: 199,
      title: 'Full Index',
      date: new Date().toISOString().slice(0, 10),
      header: 'uCode CEEFAX 199  Full Index',
      content: [
        '    FULL PAGE INDEX',
        '',
        '  100 — Main Index',
        '  101 — News Headlines',
        '  199 — Full Index (this page)',
        '  300 — Course Catalogue',
        '  301+ — Individual Courses',
        '  400 — Vault Configuration',
        '  401 — Vault Secrets',
        '  500 — Documentation Index',
        '  501+ — Doc Categories',
        '  888 — Help & About',
      ],
      fasttext: [
        { color: 'red', label: 'Main', page: 100 },
        { color: 'green', label: 'Courses', page: 300 },
        { color: 'yellow', label: 'Vault', page: 400 },
        { color: 'cyan', label: 'Help', page: 888 },
      ],
    }
  }

  private buildNotFoundPage(pageNumber: number): TeletextPage {
    return {
      page: pageNumber,
      title: 'Page Not Found',
      date: '',
      header: `uCode CEEFAX ${pageNumber}  Not Found`,
      content: [
        `    PAGE ${pageNumber} NOT FOUND`,
        '',
        '  This page is not available.',
        '',
        '  Press 100 for Main Index',
        '  Press 199 for Full Index',
      ],
      fasttext: [
        { color: 'red', label: 'Main', page: 100 },
        { color: 'green', label: 'Index', page: 199 },
        { color: 'yellow', label: 'Courses', page: 300 },
        { color: 'cyan', label: 'Help', page: 888 },
      ],
    }
  }
}
