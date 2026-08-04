import { type ElementName, type OrbmentTopology, type Quartz, type SlotId } from '../domain/types'
import {
  clampLineCount,
  createDefaultArcLengths,
  createDefaultLineDirections,
  createDefaultLineStarts,
  type LineDirection,
} from '../domain/rules/skyFcRules'

export type SlotRestrictionMap = Record<SlotId, ElementName | null>
export type EquippedQuartzMap = Record<SlotId, number | null>
export type NodeTierMap = Record<SlotId, number>

export type OrbmentState = {
  lineCount: number
  arcLengths: number[]
  lineStarts: SlotId[]
  lineDirections: LineDirection[]
  slotRestrictions: SlotRestrictionMap
  equippedQuartz: EquippedQuartzMap
  nodeTiers: NodeTierMap
}

export type OrbmentPresetShape = {
  lineCount: number
  lines: Array<{
    start: SlotId
    direction: LineDirection
    length: number
  }>
}

export type SlotElementRestrictionShape = {
  slots: SlotId[]
  element: ElementName
} | null

export function createInitialOrbmentState(topology: OrbmentTopology): OrbmentState {
  const lineCount = 2
  return {
    lineCount,
    arcLengths: createDefaultArcLengths(lineCount, topology),
    lineStarts: createDefaultLineStarts(lineCount, topology),
    lineDirections: createDefaultLineDirections(lineCount, topology.maxLines),
    slotRestrictions: createSlotRestrictionMap(topology),
    equippedQuartz: createEquippedQuartzMap(topology),
    nodeTiers: createNodeTierMap(topology),
  }
}

export function updateLineCount(state: OrbmentState, lineCount: number, topology: OrbmentTopology): OrbmentState {
  const safeLineCount = clampLineCount(lineCount, topology.maxLines)
  return {
    ...state,
    lineCount: safeLineCount,
    arcLengths: createDefaultArcLengths(safeLineCount, topology),
    lineStarts: createDefaultLineStarts(safeLineCount, topology),
    lineDirections: createDefaultLineDirections(safeLineCount, topology.maxLines),
  }
}

export function createOrbmentStateFromPreset(preset: OrbmentPresetShape, topology: OrbmentTopology): OrbmentState {
  const safeLineCount = clampLineCount(preset.lineCount, topology.maxLines)
  const defaultState = createInitialOrbmentState(topology)
  const starts = createDefaultLineStarts(safeLineCount, topology)
  const directions = createDefaultLineDirections(safeLineCount, topology.maxLines)
  const lengths = createDefaultArcLengths(safeLineCount, topology)

  for (let index = 0; index < safeLineCount; index += 1) {
    const source = preset.lines[index]
    if (!source) {
      continue
    }
    starts[index] = source.start
    directions[index] = source.direction
    lengths[index] = source.length
  }

  return {
    ...defaultState,
    lineCount: safeLineCount,
    arcLengths: lengths,
    lineStarts: starts,
    lineDirections: directions,
  }
}

export function applyPresetRestrictions(
  state: OrbmentState,
  restriction: SlotElementRestrictionShape,
): OrbmentState {
  const slotIds = Object.keys(state.slotRestrictions).map(Number)
  const slotRestrictions = Object.fromEntries(slotIds.map((slotId) => [slotId, null])) as SlotRestrictionMap

  if (restriction) {
    for (const slotId of restriction.slots) {
      slotRestrictions[slotId] = restriction.element
    }
  }

  return {
    ...state,
    slotRestrictions,
    equippedQuartz: Object.fromEntries(slotIds.map((slotId) => [slotId, null])) as EquippedQuartzMap,
  }
}

export function transferArcLength(state: OrbmentState, lineIndex: number, direction: 1 | -1): OrbmentState {
  const targetIndex = (lineIndex + 1) % state.arcLengths.length
  const updated = [...state.arcLengths]

  if (direction === 1) {
    if (updated[targetIndex] <= 1) {
      return state
    }
    updated[lineIndex] += 1
    updated[targetIndex] -= 1
  } else {
    if (updated[lineIndex] <= 1) {
      return state
    }
    updated[lineIndex] -= 1
    updated[targetIndex] += 1
  }

  return {
    ...state,
    arcLengths: updated,
  }
}

export function setLineStart(
  state: OrbmentState,
  lineIndex: number,
  start: SlotId,
  topology: OrbmentTopology,
): OrbmentState {
  if (!topology.outerSlots.includes(start)) {
    return state
  }
  if (lineIndex < 0 || lineIndex >= state.lineStarts.length) {
    return state
  }
  const duplicateIndex = state.lineStarts.findIndex(
    (lineStart, index) => index !== lineIndex && lineStart === start,
  )
  if (duplicateIndex >= 0) {
    return state
  }
  const updated = [...state.lineStarts]
  updated[lineIndex] = start
  return {
    ...state,
    lineStarts: updated,
  }
}

export function setLineDirection(
  state: OrbmentState,
  lineIndex: number,
  direction: LineDirection,
): OrbmentState {
  if (lineIndex < 0 || lineIndex >= state.lineDirections.length) {
    return state
  }
  const updated = [...state.lineDirections]
  updated[lineIndex] = direction
  return {
    ...state,
    lineDirections: updated,
  }
}

export function setSlotRestriction(
  state: OrbmentState,
  slotId: SlotId,
  restriction: ElementName | null,
  quartzById: Map<number, Quartz>,
): OrbmentState {
  const next = {
    ...state,
    slotRestrictions: {
      ...state.slotRestrictions,
      [slotId]: restriction,
    },
  }

  const equippedId = next.equippedQuartz[slotId]
  if (!equippedId) {
    return next
  }

  const equippedQuartz = quartzById.get(equippedId)
  if (!equippedQuartz) {
    return next
  }

  const isAllowed = !restriction || restriction === equippedQuartz.element
  if (isAllowed) {
    return next
  }

  return {
    ...next,
    equippedQuartz: {
      ...next.equippedQuartz,
      [slotId]: null,
    },
  }
}

export function setEquippedQuartz(
  state: OrbmentState,
  slotId: SlotId,
  quartzId: number | null,
  quartzById: Map<number, Quartz>,
): OrbmentState {
  if (!quartzId) {
    return {
      ...state,
      equippedQuartz: {
        ...state.equippedQuartz,
        [slotId]: null,
      },
    }
  }

  const quartz = quartzById.get(quartzId)
  if (!quartz) {
    return state
  }

  const restriction = state.slotRestrictions[slotId]
  if (restriction && quartz.element !== restriction) {
    return state
  }
  const nodeTier = state.nodeTiers[slotId]
  if (quartz.tier && quartz.tier > nodeTier) {
    return state
  }

  if (quartz.exclusive_group) {
    for (const [otherSlotKey, otherQuartzId] of Object.entries(state.equippedQuartz)) {
      const otherSlotId = Number(otherSlotKey) as SlotId
      if (otherSlotId === slotId || !otherQuartzId) {
        continue
      }
      const otherQuartz = quartzById.get(otherQuartzId)
      if (otherQuartz?.exclusive_group === quartz.exclusive_group) {
        return state
      }
    }
  }

  return {
    ...state,
    equippedQuartz: {
      ...state.equippedQuartz,
      [slotId]: quartzId,
    },
  }
}

export function getAllowedQuartzForSlot(
  quartzList: Quartz[],
  slotId: SlotId,
  restrictions: SlotRestrictionMap,
  equippedQuartz: EquippedQuartzMap,
  quartzById: Map<number, Quartz>,
  nodeTiers: NodeTierMap,
): Quartz[] {
  const restriction = restrictions[slotId]
  const currentQuartzId = equippedQuartz[slotId]
  const usedGroups = getUsedExclusiveGroups(equippedQuartz, quartzById, slotId)

  return quartzList.filter((quartz) => {
    if (restriction && quartz.element !== restriction) {
      return false
    }
    const nodeTier = nodeTiers[slotId]
    if (quartz.tier && quartz.tier > nodeTier) {
      return false
    }

    if (!quartz.exclusive_group) {
      return true
    }

    if (currentQuartzId === quartz.id) {
      return true
    }

    return !usedGroups.has(quartz.exclusive_group)
  })
}

export function getAvailableLineStarts(
  state: OrbmentState,
  lineIndex: number,
  topology: OrbmentTopology,
): SlotId[] {
  const usedByOthers = new Set(
    state.lineStarts
      .map((lineStart, index) => (index === lineIndex ? null : lineStart))
      .filter((lineStart): lineStart is SlotId => lineStart !== null),
  )
  return topology.outerSlots.filter(
    (slotId) => slotId === state.lineStarts[lineIndex] || !usedByOthers.has(slotId),
  )
}

export function setNodeTier(
  state: OrbmentState,
  slotId: SlotId,
  tier: number,
  quartzById: Map<number, Quartz>,
): OrbmentState {
  if (!Number.isInteger(tier) || tier < 1) {
    return state
  }

  const next = {
    ...state,
    nodeTiers: {
      ...state.nodeTiers,
      [slotId]: tier,
    },
  }
  const equippedId = next.equippedQuartz[slotId]
  const equippedQuartz = equippedId ? quartzById.get(equippedId) : null
  if (!equippedQuartz || !equippedQuartz.tier || equippedQuartz.tier <= tier) {
    return next
  }

  return {
    ...next,
    equippedQuartz: {
      ...next.equippedQuartz,
      [slotId]: null,
    },
  }
}

export function getUsedExclusiveGroups(
  equippedQuartz: EquippedQuartzMap,
  quartzById: Map<number, Quartz>,
  ignoreSlotId?: SlotId,
): Set<string> {
  const groups = new Set<string>()
  for (const [slotKey, quartzId] of Object.entries(equippedQuartz)) {
    const slotId = Number(slotKey) as SlotId
    if (!quartzId || (ignoreSlotId && slotId === ignoreSlotId)) {
      continue
    }
    const quartz = quartzById.get(quartzId)
    if (quartz?.exclusive_group) {
      groups.add(quartz.exclusive_group)
    }
  }
  return groups
}

function createSlotRestrictionMap(topology: OrbmentTopology): SlotRestrictionMap {
  return Object.fromEntries(topology.slotIds.map((slotId) => [slotId, null])) as SlotRestrictionMap
}

function createEquippedQuartzMap(topology: OrbmentTopology): EquippedQuartzMap {
  return Object.fromEntries(topology.slotIds.map((slotId) => [slotId, null])) as EquippedQuartzMap
}

function createNodeTierMap(topology: OrbmentTopology): NodeTierMap {
  return Object.fromEntries(
    topology.slotIds.map((slotId) => [slotId, topology.nodeTierDefaults[slotId] ?? 1]),
  ) as NodeTierMap
}
