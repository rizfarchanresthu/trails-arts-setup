import { ELEMENTS, type ElementName, type ElementRequirement, type OrbmentLine, type OrbmentTopology, type SlotId } from '../types'

export const MIN_LINES = 1
export const OUTER_DIRECTION_SEQUENCE: SlotId[] = [2, 3, 4, 5, 6]

export type LineDirection = 'cw' | 'ccw'

export const OUTER_ADJACENCY: Record<number, SlotId[]> = {
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
  topology: OrbmentTopology
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

export function createDefaultArcLengths(lineCount: number, topology: OrbmentTopology): number[] {
  const safeLineCount = clampLineCount(lineCount, topology.maxLines)
  const arcLengths = new Array<number>(safeLineCount).fill(1)
  let remaining = topology.outerSlots.length - safeLineCount
  let index = 0

  while (remaining > 0) {
    arcLengths[index] += 1
    index = (index + 1) % safeLineCount
    remaining -= 1
  }

  return arcLengths
}

export function createDefaultLineDirections(lineCount: number, maxLines: number): LineDirection[] {
  return new Array<LineDirection>(clampLineCount(lineCount, maxLines)).fill('cw')
}

export function createDefaultLineStarts(lineCount: number, topology: OrbmentTopology): SlotId[] {
  const safeLineCount = clampLineCount(lineCount, topology.maxLines)
  return topology.outerDirectionSequence.slice(0, safeLineCount)
}

export function clampLineCount(lineCount: number, maxLines: number): number {
  return Math.max(MIN_LINES, Math.min(maxLines, lineCount))
}

export function isValidArcLengths(arcLengths: number[], lineCount: number, outerSlotsCount: number): boolean {
  if (arcLengths.length !== lineCount) {
    return false
  }

  if (arcLengths.some((length) => length < 1)) {
    return false
  }

  return arcLengths.reduce((sum, length) => sum + length, 0) === outerSlotsCount
}

export function deriveLinesFromConfig(config: OrbmentTopologyConfig): DeriveLinesResult {
  const warnings: string[] = []
  const lineCount = clampLineCount(config.lineCount, config.topology.maxLines)
  const baseArcLengths = config.lineConfigs.map((lineConfig) => lineConfig.length)
  const arcLengths = isValidArcLengths(baseArcLengths, lineCount, config.topology.outerSlots.length)
    ? baseArcLengths
    : createDefaultArcLengths(lineCount, config.topology)
  const starts = sanitizeLineStarts(
    config.lineConfigs.map((lineConfig) => lineConfig.start),
    lineCount,
    config.topology,
  )
  const directions = sanitizeLineDirections(
    config.lineConfigs.map((lineConfig) => lineConfig.direction),
    lineCount,
    config.topology.maxLines,
  )

  if (!isValidArcLengths(baseArcLengths, lineCount, config.topology.outerSlots.length)) {
    warnings.push('Invalid line lengths were reset to defaults.')
  }
  if (!areUnique(starts)) {
    warnings.push('Duplicate line starts were adjusted to stay unique.')
  }

  const lines: OrbmentLine[] = []
  const claimed = new Set<SlotId>()

  for (let index = 0; index < lineCount; index += 1) {
    const built = buildLineWalk(starts[index], directions[index], arcLengths[index], claimed, config.topology)
    lines.push([config.topology.centerSlot, ...built.path])
    for (const slotId of built.path) {
      claimed.add(slotId)
    }
    warnings.push(...built.warnings)
  }

  if (claimed.size !== config.topology.outerSlots.length) {
    warnings.push('Some slots could not be assigned without violating adjacency/overlap constraints.')
  }

  return { lines, warnings }
}

function buildLineWalk(
  start: SlotId,
  direction: LineDirection,
  targetLength: number,
  claimed: Set<SlotId>,
  topology: OrbmentTopology,
): { path: SlotId[]; warnings: string[] } {
  const warnings: string[] = []
  const path: SlotId[] = []
  let current = start

  if (claimed.has(start)) {
    const fallbackStart = topology.outerDirectionSequence.find((slotId) => !claimed.has(slotId))
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
    const next = nextOuterByDirection(current, direction, topology)
    if (!next || !topology.outerAdjacency[current].includes(next) || claimed.has(next) || path.includes(next)) {
      const alternative = topology.outerAdjacency[current].find(
        (slotId) => slotId !== topology.centerSlot && !claimed.has(slotId) && !path.includes(slotId),
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

function nextOuterByDirection(
  current: SlotId,
  direction: LineDirection,
  topology: OrbmentTopology,
): SlotId | null {
  const directionSequence = topology.outerDirectionSequence
  const index = directionSequence.indexOf(current)
  if (index < 0) {
    return null
  }

  const delta = direction === 'cw' ? 1 : -1
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= directionSequence.length) {
    if (!topology.wrapsOuterRing) {
      return null
    }
    return directionSequence[(nextIndex + directionSequence.length) % directionSequence.length]
  }
  return directionSequence[nextIndex]
}

function sanitizeLineStarts(starts: SlotId[], lineCount: number, topology: OrbmentTopology): SlotId[] {
  const fallbacks = createDefaultLineStarts(lineCount, topology)
  const normalized = [...starts]
  for (let index = 0; index < lineCount; index += 1) {
    if (!topology.outerSlots.includes(normalized[index])) {
      normalized[index] = fallbacks[index]
    }
  }
  return normalized
}

function sanitizeLineDirections(
  directions: LineDirection[],
  lineCount: number,
  maxLines: number,
): LineDirection[] {
  const fallbacks = createDefaultLineDirections(lineCount, maxLines)
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
