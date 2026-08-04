import { ELEMENTS, type ElementName, type ElementRequirement, type OrbmentLine, type SlotId } from '../types'

// Hex perimeter order starting bottom-left, clockwise, with the bottom vertex empty.
// Slots 6 (bottom-right) and 2 (bottom-left) are not outer-adjacent (gap).
export const OUTER_SLOTS: SlotId[] = [2, 3, 4, 5, 6]
export const CENTER_SLOT: SlotId = 1
export const MIN_LINES = 1
export const MAX_LINES = 5
export const OUTER_DIRECTION_SEQUENCE: SlotId[] = [2, 3, 4, 5, 6]

export type LineDirection = 'cw' | 'ccw'

export const OUTER_ADJACENCY: Record<SlotId, SlotId[]> = {
  1: [2, 3, 4, 5, 6],
  2: [1, 3],
  3: [1, 2, 4],
  4: [1, 3, 5],
  5: [1, 4, 6],
  6: [1, 5],
}

export type OrbmentLineConfig = {
  start: SlotId
  direction: LineDirection
  length: number
}

export type OrbmentTopologyConfig = {
  lineCount: number
  lineConfigs: OrbmentLineConfig[]
}

export type DeriveLinesResult = {
  lines: OrbmentLine[]
  warnings: string[]
}

export function createEmptyTotals(): Record<ElementName, number> {
  return ELEMENTS.reduce(
    (acc, element) => {
      acc[element] = 0
      return acc
    },
    {} as Record<ElementName, number>,
  )
}

export function createDefaultArcLengths(lineCount: number): number[] {
  const safeLineCount = clampLineCount(lineCount)
  const arcLengths = new Array<number>(safeLineCount).fill(1)
  let remaining = OUTER_SLOTS.length - safeLineCount
  let index = 0

  while (remaining > 0) {
    arcLengths[index] += 1
    index = (index + 1) % safeLineCount
    remaining -= 1
  }

  return arcLengths
}

export function createDefaultLineDirections(lineCount: number): LineDirection[] {
  return new Array<LineDirection>(clampLineCount(lineCount)).fill('cw')
}

export function createDefaultLineStarts(lineCount: number): SlotId[] {
  const safeLineCount = clampLineCount(lineCount)
  return OUTER_DIRECTION_SEQUENCE.slice(0, safeLineCount)
}

export function clampLineCount(lineCount: number): number {
  return Math.max(MIN_LINES, Math.min(MAX_LINES, lineCount))
}

export function isValidArcLengths(arcLengths: number[], lineCount: number): boolean {
  if (arcLengths.length !== lineCount) {
    return false
  }

  if (arcLengths.some((length) => length < 1)) {
    return false
  }

  return arcLengths.reduce((sum, length) => sum + length, 0) === OUTER_SLOTS.length
}

export function deriveLinesFromConfig(config: OrbmentTopologyConfig): DeriveLinesResult {
  const warnings: string[] = []
  const lineCount = clampLineCount(config.lineCount)
  const baseArcLengths = config.lineConfigs.map((lineConfig) => lineConfig.length)
  const arcLengths = isValidArcLengths(baseArcLengths, lineCount)
    ? baseArcLengths
    : createDefaultArcLengths(lineCount)
  const starts = sanitizeLineStarts(
    config.lineConfigs.map((lineConfig) => lineConfig.start),
    lineCount,
  )
  const directions = sanitizeLineDirections(
    config.lineConfigs.map((lineConfig) => lineConfig.direction),
    lineCount,
  )

  if (!isValidArcLengths(baseArcLengths, lineCount)) {
    warnings.push('Invalid line lengths were reset to defaults.')
  }
  if (!areUnique(starts)) {
    warnings.push('Duplicate line starts were adjusted to stay unique.')
  }

  const lines: OrbmentLine[] = []
  const claimed = new Set<SlotId>()

  for (let index = 0; index < lineCount; index += 1) {
    const built = buildLineWalk(starts[index], directions[index], arcLengths[index], claimed)
    lines.push([CENTER_SLOT, ...built.path])
    for (const slotId of built.path) {
      claimed.add(slotId)
    }
    warnings.push(...built.warnings)
  }

  if (claimed.size !== OUTER_SLOTS.length) {
    warnings.push('Some slots could not be assigned without violating adjacency/overlap constraints.')
  }

  return { lines, warnings }
}

function buildLineWalk(
  start: SlotId,
  direction: LineDirection,
  targetLength: number,
  claimed: Set<SlotId>,
): { path: SlotId[]; warnings: string[] } {
  const warnings: string[] = []
  const path: SlotId[] = []
  let current = start

  if (claimed.has(start)) {
    const fallbackStart = OUTER_DIRECTION_SEQUENCE.find((slotId) => !claimed.has(slotId))
    if (!fallbackStart) {
      return { path, warnings: ['Line start conflict could not be resolved.'] }
    }
    current = fallbackStart
    warnings.push(`Line start ${start} was already used and got reassigned.`)
  }

  while (path.length < targetLength) {
    if (claimed.has(current) || path.includes(current)) {
      break
    }
    path.push(current)
    const next = nextOuterByDirection(current, direction)
    if (!next || !OUTER_ADJACENCY[current].includes(next) || claimed.has(next) || path.includes(next)) {
      const alternative = OUTER_ADJACENCY[current].find(
        (slotId) => slotId !== CENTER_SLOT && !claimed.has(slotId) && !path.includes(slotId),
      )
      if (!alternative) {
        break
      }
      warnings.push(`Line path from ${start} required adjacency fallback near slot ${current}.`)
      current = alternative
      continue
    }
    current = next
  }

  return { path, warnings }
}

function nextOuterByDirection(current: SlotId, direction: LineDirection): SlotId | null {
  const index = OUTER_DIRECTION_SEQUENCE.indexOf(current)
  if (index < 0) {
    return null
  }

  const delta = direction === 'cw' ? 1 : -1
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= OUTER_DIRECTION_SEQUENCE.length) {
    return null
  }
  return OUTER_DIRECTION_SEQUENCE[nextIndex]
}

function sanitizeLineStarts(starts: SlotId[], lineCount: number): SlotId[] {
  const fallbacks = createDefaultLineStarts(lineCount)
  const normalized = [...starts]
  for (let index = 0; index < lineCount; index += 1) {
    if (!OUTER_SLOTS.includes(normalized[index])) {
      normalized[index] = fallbacks[index]
    }
  }
  return normalized
}

function sanitizeLineDirections(directions: LineDirection[], lineCount: number): LineDirection[] {
  const fallbacks = createDefaultLineDirections(lineCount)
  const normalized = [...directions]
  for (let index = 0; index < lineCount; index += 1) {
    if (normalized[index] !== 'cw' && normalized[index] !== 'ccw') {
      normalized[index] = fallbacks[index]
    }
  }
  return normalized
}

function areUnique(values: SlotId[]): boolean {
  return new Set(values).size === values.length
}

export function applyElementRequirement(
  totals: Record<ElementName, number>,
  requirement: ElementRequirement,
): void {
  if (requirement.element) {
    totals[requirement.element] += requirement.value
    return
  }

  // Shared-value requirements in this dataset are represented as element groups.
  // We add the value to each grouped element for a deterministic first-pass calculator.
  if (requirement.elements) {
    for (const element of requirement.elements) {
      totals[element] += requirement.value
    }
  }
}
