import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { readdirSync, statSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Types (aligned with SKILLS_FRAMEWORK.md §1)
// ---------------------------------------------------------------------------

export interface SourceMinerInput {
  source: {
    type: 'repository' | 'local_path'
    url: string
    branch?: string
    language: string[]
  }
  options: {
    scan_depth?: 'shallow' | 'full'
    target_patterns?: string[]
    exclude_patterns?: string[]
  }
}

export interface MemoryMapEntry {
  label: string
  address: string
  type: string
  description: string
  confidence: number
  length?: number
  element_type?: string
}

export interface FunctionEntry {
  name: string
  address: string
  description: string
  parameters: { register?: string; description: string }[]
}

export interface DataStructure {
  name: string
  size: number
  fields: { offset: number; name: string; size: number }[]
}

export interface AssetReference {
  path: string
  type: string
  count?: number
  description: string
}

export interface Recommendation {
  action: string
  target: string
  priority: 'high' | 'medium' | 'low'
  rationale: string
}

export interface SourceMinerOutput {
  skill: 'Source-Miner'
  version: '1.0'
  executed_at: string
  source: string
  findings: {
    memory_map: MemoryMapEntry[]
    functions: FunctionEntry[]
    data_structures: DataStructure[]
    asset_references: AssetReference[]
  }
  recommendations: Recommendation[]
}

// ---------------------------------------------------------------------------
// 6502 Assembly Scanner
// ---------------------------------------------------------------------------

const ASM_EXTENSIONS = new Set(['.asm', '.s', '.6502', '.a65', '.inc', '.eq', '.bbc'])

// Common 6502 memory-mapped hardware registers
const KNOWN_HARDWARE: Record<string, string> = {
  '0xfe00': 'VIA port B (user port)',
  '0xfe01': 'VIA port A (keyboard/sound)',
  '0xfe04': 'VIA timer 1 counter low',
  '0xfe05': 'VIA timer 1 counter high',
  '0xfe08': 'VIA ACR (auxiliary control register)',
  '0xfe09': 'VIA PCR (peripheral control register)',
  '0xfe0a': 'VIA IFR (interrupt flag register)',
  '0xfe0b': 'VIA IER (interrupt enable register)',
  '0xfe40': '6845 CRTC address register',
  '0xfe41': '6845 CRTC data register',
  '0xfe60': 'ACIA 6850 status/control',
  '0xfe61': 'ACIA 6850 data',
  '0xfe80': 'INTON (interrupt enable flip-flop)',
  '0xfe84': 'ROMSEL (paging register)',
  '0xfea0': 'System VIA IER',
  '0xfec0': 'ADC data high',
  '0xfec1': 'ADC data low',
  '0xfee0': 'Tube ULA data',
  '0xfee1': 'Tube ULA status',
  '0xff00': 'OSBYTE entry point',
  '0xffe3': 'OSBYTE indirect',
  '0xffe7': 'OSWORD entry point',
  '0xfff4': 'OSCLI entry point',
}

const COMMENT_RE = /^[;*]/m
const SUBROUTINE_RE = /^\.(\w+)\s*$/m

// Asset path heuristics
const ASSET_PATH_PATTERNS = [
  { regex: /(?:^|[./])gfx[/\\]/i, type: 'sprite_data' },
  { regex: /(?:^|[./])sprites?[/\\]/i, type: 'sprite_data' },
  { regex: /(?:^|[./])graphics?[/\\]/i, type: 'sprite_data' },
  { regex: /(?:^|[./])text[/\\]/i, type: 'teletext_pages' },
  { regex: /(?:^|[./])data[/\\]/i, type: 'game_data' },
  { regex: /(?:^|[./])levels?[/\\]/i, type: 'level_data' },
  { regex: /(?:^|[./])maps?[/\\]/i, type: 'map_data' },
  { regex: /(?:^|[./])sound(s)?[/\\]/i, type: 'audio_data' },
  { regex: /(?:^|[./])music[/\\]/i, type: 'audio_data' },
  { regex: /(?:^|[./])chars?[/\\]/i, type: 'character_data' },
  { regex: /\.(?:bin|raw|dat|spr)$/i, type: 'binary_asset' },
  { regex: /\.(?:png|bmp|gif)$/i, type: 'image_asset' },
  { regex: /\.(?:wav|ogg|mp3)$/i, type: 'audio_asset' },
]

function isAsmFile(path: string): boolean {
  const ext = extname(path).toLowerCase()
  if (ASM_EXTENSIONS.has(ext)) return true
  // Check for extensionless BBC BASIC / assembly files by heuristic
  const base = path.split('/').pop() || ''
  if (!base.includes('.') && !ext) {
    // Could be a BeebAsm file — read first line to check
    return true
  }
  return false
}

function matchesTarget(path: string, patterns: string[]): boolean {
  if (patterns.length === 0) return isAsmFile(path)
  return patterns.some((p) => {
    try {
      return new RegExp(
        '^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
        'i',
      ).test(path)
    } catch {
      return path.toLowerCase().includes(p.toLowerCase().replace(/\*/g, ''))
    }
  })
}

function matchesExclude(path: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false
  return patterns.some((p) => {
    try {
      return new RegExp(
        '^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
        'i',
      ).test(path)
    } catch {
      return path.toLowerCase().includes(p.toLowerCase().replace(/\*/g, ''))
    }
  })
}

function scanFile(
  filePath: string,
  fileContent: string,
  currentOrg: number | null,
): {
  memoryEntries: MemoryMapEntry[]
  functions: FunctionEntry[]
  structures: DataStructure[]
  org: number | null
} {
  const lines = fileContent.split('\n')
  const memoryEntries: MemoryMapEntry[] = []
  const functions: FunctionEntry[] = []
  const structures: DataStructure[] = []

  let org = currentOrg
  let prevLabel: string | null = null
  let inDataBlock = false
  let dataBlockFields: { offset: number; name: string; size: number }[] = []
  let dataBlockName = ''
  let dataBlockOffset = 0
  let addressCounter = 0
  let commentBuffer = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineNo = i + 1

    // Track comment for description
    if (/^[;*\\]/.test(line)) {
      commentBuffer = line.replace(/^[;*\\]+\s*/, '')
      continue
    }

    // ORG directive – supports $xxxx, &xxxx, and bare hex
    const orgMatch = line.match(/^(?:ORG|\*)\s*(?:=)?\s*[$&]?([0-9A-Fa-f]+)/i)
    if (orgMatch) {
      org = parseInt(orgMatch[1], 16)
      addressCounter = 0
      continue
    }

    // EQU / = assignment – supports $xxxx, &xxxx, and bare hex; captures inline comments
    const equMatch = line.match(/^(\w+)\s+(?:EQU|=)\s*[$&]?([0-9A-Fa-f]+)\s*(?:[;\\]\s*(.*))?/i)
    if (equMatch) {
      const label = equMatch[1]
      const addr = parseInt(equMatch[2], 16)
      // Use inline comment if present, otherwise use buffered comment
      const inlineComment = equMatch[3]?.trim()
      if (inlineComment) commentBuffer = inlineComment
      const addrHex = '0x' + addr.toString(16).padStart(4, '0')
      // Skip common assembler constants
      if (/^(PAGE|OS|VIA|SHEILA|CRTC|ACIA|ADC|TUBE|ULA|USER|INTON|ROMSEL|SYSTEM)/i.test(label)) {
        commentBuffer = ''
        continue
      }
      const hwDesc = KNOWN_HARDWARE[addrHex]
      if (hwDesc) {
        memoryEntries.push({
          label,
          address: addrHex,
          type: 'byte',
          description: hwDesc,
          confidence: 0.95,
        })
      } else {
        memoryEntries.push({
          label,
          address: addrHex,
          type: 'byte',
          description: commentBuffer || `${label} constant`,
          confidence: commentBuffer ? 0.85 : 0.7,
        })
      }
      commentBuffer = ''
      continue
    }

    // Label definition (dot-label style in BeebAsm)
    const labelMatch = line.match(/^\.(\w+)(?:\s*$|\s*;|\s*[\\*;])/)
    if (labelMatch) {
      prevLabel = labelMatch[1]
      if (org !== null) {
        const addr = org + addressCounter
        const addrHex = '0x' + addr.toString(16).padStart(4, '0')

        // Check if this looks like a subroutine (more than just a label)
        const prevLine = i > 0 ? lines[i - 1].trim() : ''
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ''
        const looksLikeFunction =
          nextLine && /^(?:LDA|LDX|LDY|STA|STX|STY|JSR|JMP|PHA|PHP|PLA|PLP|TXA|TYA|TAX|TAY|CLC|SEC|CLI|SEI|CLD|SED|CLV|INX|INY|DEX|DEY|RTS|RTI|BIT)/i.test(nextLine)

        if (looksLikeFunction) {
          functions.push({
            name: prevLabel,
            address: addrHex,
            description: commentBuffer || `${prevLabel} subroutine`,
            parameters: extractParameters(lines, i + 1),
          })
        } else {
          memoryEntries.push({
            label: prevLabel,
            address: addrHex,
            type: 'byte',
            description: commentBuffer || `${prevLabel} data label`,
            confidence: 0.75,
          })
        }
      }
      commentBuffer = ''
      continue
    }

    // EQUB/EQUD/EQUW — data definitions
    if (/^(?:EQUB|EQUD|EQUW|DEFB|DEFW|DEFM|EQUS)\s/i.test(line)) {
      if (prevLabel && inDataBlock) {
        const sizeHint = /^(EQUB|DEFB|DEFM|EQUS)/i.test(line) ? 1 : /^(EQUW|DEFW)/i.test(line) ? 2 : 4
        dataBlockFields.push({ offset: dataBlockOffset, name: prevLabel, size: sizeHint })
        dataBlockOffset += sizeHint
      }
      // Count bytes: EQUB "hello" = 5, EQUB 1,2,3 = 3
      const dataMatch = line.match(/^(?:EQUB|EQUD|EQUW|DEFB|DEFW|DEFM|EQUS)\s+(.+)/i)
      if (dataMatch) {
        const data = dataMatch[1]
        const quotedMatch = data.match(/^"([^"]*)"/)
        if (quotedMatch) {
          addressCounter += quotedMatch[1].length
        } else {
          addressCounter += data.split(',').length * (/^(EQUD)/i.test(line) ? 4 : /^(EQUW|DEFW)/i.test(line) ? 2 : 1)
        }
      }
      prevLabel = null
      commentBuffer = ''
      continue
    }

    // Start of a data block (reserve space) — bare number is decimal, $/& prefix is hex
    if (/^(?:SKIP|RES|DS|RMB)\s+(?:[$&])?([0-9A-Fa-f]+)/i.test(line)) {
      const skipMatch = line.match(/^(?:SKIP|RES|DS|RMB)\s+(?:[$&])?([0-9A-Fa-f]+)/i)!
      const rawVal = skipMatch[1]
      const isHex = /^[$&]/.test(line.match(/^(?:SKIP|RES|DS|RMB)\s+([$&])/i)?.[1] || '')
      const skipBytes = isHex ? parseInt(rawVal, 16) : parseInt(rawVal, 10)
      if (prevLabel) {
        structures.push({
          name: prevLabel,
          size: skipBytes,
          fields: [],
        })
        memoryEntries.push({
          label: prevLabel,
          address: org !== null ? '0x' + (org + addressCounter).toString(16).padStart(4, '0') : 'unknown',
          type: 'struct',
          description: commentBuffer || `${prevLabel} data structure`,
          confidence: 0.6,
          length: skipBytes,
        })
      }
      addressCounter += skipBytes
      prevLabel = null
      commentBuffer = ''
      continue
    }

    // Nesting data block entry (label inside structure)
    if (prevLabel && !/^(?:LDA|LDX|LDY|STA|STX|STY|JSR|JMP|RTS|RTI|BNE|BEQ|BCC|BCS|BPL|BMI|BVC|BVS|CMP|CPX|CPY|ADC|SBC|AND|ORA|EOR|ASL|LSR|ROL|ROR|INC|DEC|INX|INY|DEX|DEY|PHA|PHP|PLA|PLP|TXA|TYA|TAX|TAY|CLC|SEC|CLI|SEI|CLD|SED|CLV|NOP|BRK)/i.test(line)) {
      // This label is followed by data, likely a structure field
      if (!inDataBlock) {
        dataBlockName = prevLabel
        dataBlockFields = []
        dataBlockOffset = 0
        inDataBlock = true
      }
      commentBuffer = ''
      continue
    }

    // Regular instruction — track but don't record
    if (/^(?:LDA|LDX|LDY|STA|STX|STY|JSR|JMP|RTS|RTI|BNE|BEQ|BCC|BCS|BPL|BMI|BVC|BVS|CMP|CPX|CPY|ADC|SBC|AND|ORA|EOR|ASL|LSR|ROL|ROR|INC|DEC|INX|INY|DEX|DEY|PHA|PHP|PLA|PLP|TXA|TYA|TAX|TAY|CLC|SEC|CLI|SEI|CLD|SED|CLV|NOP|BRK)/i.test(line)) {
      addressCounter += line.startsWith('JSR') || line.startsWith('JMP') ? 3 : line.startsWith('BNE') || line.startsWith('BEQ') || line.startsWith('BCC') || line.startsWith('BCS') || line.startsWith('BPL') || line.startsWith('BMI') || line.startsWith('BVC') || line.startsWith('BVS') ? 2 : 1
      if (inDataBlock && dataBlockName) {
        // Flush data block
        structures.push({
          name: dataBlockName,
          size: dataBlockOffset,
          fields: dataBlockFields,
        })
        inDataBlock = false
        dataBlockName = ''
        dataBlockFields = []
      }
      prevLabel = null
      commentBuffer = ''
      continue
    }

    prevLabel = null
    commentBuffer = ''
  }

  // Flush trailing data block
  if (inDataBlock && dataBlockName) {
    structures.push({
      name: dataBlockName,
      size: dataBlockOffset,
      fields: dataBlockFields,
    })
  }

  return { memoryEntries, functions, structures, org }
}

function extractParameters(
  lines: string[],
  startIndex: number,
): { register?: string; description: string }[] {
  const params: { register?: string; description: string }[] = []
  // Scan next ~20 lines for JSR calls and register setup
  for (let i = startIndex; i < Math.min(startIndex + 20, lines.length); i++) {
    const line = lines[i].trim()
    const ldaMatch = line.match(/LDA\s+#?\$?\w+/i)
    if (ldaMatch && !params.some((p) => p.register === 'A')) {
      params.push({ register: 'A', description: line })
    }
    const ldxMatch = line.match(/LDX\s+#?\$?\w+/i)
    if (ldxMatch && !params.some((p) => p.register === 'X')) {
      params.push({ register: 'X', description: line })
    }
    const ldyMatch = line.match(/LDY\s+#?\$?\w+/i)
    if (ldyMatch && !params.some((p) => p.register === 'Y')) {
      params.push({ register: 'Y', description: line })
    }
    if (line.startsWith('RTS') || line.startsWith('JMP')) break
  }
  return params
}

function scanDirectory(rootPath: string, patterns: string[], excludePatterns: string[]): string[] {
  const results: string[] = []

  function walk(dir: string): void {
    try {
      const entries = readdirSync(dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        try {
          const st = statSync(fullPath)
          if (st.isDirectory()) {
            if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== '.git') {
              walk(fullPath)
            }
          } else {
            const relPath = fullPath.replace(rootPath + '/', '')
            if (!matchesExclude(relPath, excludePatterns)) {
              // If no patterns specified, accept assembly files
              if (patterns.length === 0) {
                if (isAsmFile(fullPath)) results.push(fullPath)
              } else if (matchesTarget(relPath, patterns)) {
                results.push(fullPath)
              }
            }
          }
        } catch {
          // skip inaccessible entries
        }
      }
    } catch {
      // skip inaccessible directories
    }
  }

  walk(rootPath)
  return results
}

function detectAssetReferences(rootPath: string): AssetReference[] {
  const refs: AssetReference[] = []
  const seen = new Set<string>()

  function walk(dir: string): void {
    try {
      const entries = readdirSync(dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        try {
          const st = statSync(fullPath)
          if (st.isDirectory()) {
            if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== '.git') {
              walk(fullPath)
            }
          } else {
            const relPath = fullPath.replace(rootPath + '/', '')
            for (const { regex, type } of ASSET_PATH_PATTERNS) {
              if (regex.test(relPath) && !seen.has(relPath)) {
                seen.add(relPath)
                refs.push({
                  path: relPath,
                  type,
                  description: `${type.replace(/_/g, ' ')}: ${entry}`,
                })
              }
            }
          }
        } catch {
          // skip
        }
      }
    } catch {
      // skip
    }
  }

  walk(rootPath)

  // Collapse by type
  const collapsed: Record<string, { count: number; type: string; examples: string[] }> = {}
  for (const ref of refs) {
    if (!collapsed[ref.type]) {
      collapsed[ref.type] = { count: 0, type: ref.type, examples: [] }
    }
    collapsed[ref.type].count++
    if (collapsed[ref.type].examples.length < 3) {
      collapsed[ref.type].examples.push(ref.path)
    }
  }

  return Object.values(collapsed).map((c) => ({
    path: c.examples[0] || rootPath,
    type: c.type,
    count: c.count,
    description: `${c.count} ${c.type.replace(/_/g, ' ')} file(s)`,
  }))
}

function generateRecommendations(
  findings: SourceMinerOutput['findings'],
  sourcePath: string,
): Recommendation[] {
  const recs: Recommendation[] = []

  // Recommend LENS extractors for state variables
  const stateLabels = findings.memory_map.filter(
    (m) =>
      /score|status|state|lives|level|time|health|energy|position|x_pos|y_pos|inventory|ship/i.test(
        m.label,
      ) && m.confidence >= 0.7,
  )
  for (const entry of stateLabels.slice(0, 5)) {
    recs.push({
      action: 'create_lens_extractor',
      target: entry.label,
      priority: entry.confidence >= 0.85 ? 'high' : 'medium',
      rationale: `Game state variable for save/load and telemetry (${entry.description})`,
    })
  }

  // Recommend control commands for subroutines
  const commandLabels = ['MainLoop', 'Dock', 'Jump', 'Launch', 'Start', 'Init', 'Title', 'Death', 'Win', 'Lose', 'Pause', 'Save', 'Load']
  for (const fn of findings.functions) {
    if (commandLabels.some((c) => fn.name.toLowerCase().includes(c.toLowerCase()))) {
      recs.push({
        action: 'create_control_command',
        target: fn.name,
        priority: 'medium',
        rationale: `${fn.name} is a game event trigger point`,
      })
    }
  }

  // Recommend SKIN for assets
  if (findings.asset_references.length > 0) {
    recs.push({
      action: 'create_skin_manifest',
      target: sourcePath,
      priority: 'high',
      rationale: `${findings.asset_references.length} asset type(s) found — create SKIN theme`,
    })
  }

  // Recommend LENS-Craft for structures
  if (findings.data_structures.length > 0) {
    recs.push({
      action: 'run_lens_craft',
      target: findings.data_structures.map((s) => s.name).join(', '),
      priority: 'medium',
      rationale: `${findings.data_structures.length} data structure(s) found — generate LENS extractors`,
    })
  }

  return recs
}

// ---------------------------------------------------------------------------
// Main Source-Miner entry point
// ---------------------------------------------------------------------------

export function sourceMiner(input: SourceMinerInput): SourceMinerOutput {
  const patterns = input.options.target_patterns || []
  const excludePatterns = input.options.exclude_patterns || []

  const sourcePath = input.source.url

  if (!existsSync(sourcePath)) {
    throw new Error(`Source path not found: ${sourcePath}`)
  }

  const st = statSync(sourcePath)
  const files =
    st.isDirectory() ? scanDirectory(sourcePath, patterns, excludePatterns) : [sourcePath]

  const allMemory: MemoryMapEntry[] = []
  const allFunctions: FunctionEntry[] = []
  const allStructures: DataStructure[] = []

  let currentOrg: number | null = null

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8')
      const result = scanFile(file, content, currentOrg)
      allMemory.push(...result.memoryEntries)
      allFunctions.push(...result.functions)
      allStructures.push(...result.structures)
      if (result.org !== null) currentOrg = result.org
    } catch {
      // skip unreadable files
    }
  }

  // Scan the root path for assets
  const rootPath = st.isDirectory() ? sourcePath : sourcePath.split('/').slice(0, -1).join('/') || '.'
  const assets = detectAssetReferences(rootPath)

  const findings = {
    memory_map: allMemory,
    functions: allFunctions,
    data_structures: allStructures,
    asset_references: assets,
  }

  const recommendations = generateRecommendations(findings, sourcePath)

  return {
    skill: 'Source-Miner',
    version: '1.0',
    executed_at: new Date().toISOString(),
    source: sourcePath,
    findings,
    recommendations,
  }
}