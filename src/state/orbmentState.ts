import { canEquipColdSteelIQuartz } from '../domain/rules/coldSteelIRules'
import {
  isColdSteelRuleSet,
  quartzFitsSlotRestriction,
  type ElementName,
  type MasterQuartz,
  type MasterQuartzLevel,
  type OrbmentLine,
  type OrbmentRuleSetId,
  type OrbmentTopology,
  type Quartz,
  type SlotId,
} from '../domain/types'
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
  equippedMasterQuartzId: number | null
  masterQuartzLevel: number
}

export type OrbmentPresetShape = {
  lineCount: number
  lines: Array<{
    start: SlotId
    direction: LineDirection
    length: number
  }>
}

export type SlotElementRestrictionGroup = {
  slots: SlotId[]
  element: ElementName
}

export type SlotElementRestrictionShape = SlotElementRestrictionGroup | SlotElementRestrictionGroup[] | null

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
    equippedMasterQuartzId: null,
    masterQuartzLevel: 1,
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

  const restrictionGroups = !restriction ? [] : Array.isArray(restriction) ? restriction : [restriction]
  for (const group of restrictionGroups) {
    for (const slotId of group.slots) {
      slotRestrictions[slotId] = group.element
    }
  }

  return {
    ...state,
    slotRestrictions,
    equippedQuartz: Object.fromEntries(slotIds.map((slotId) => [slotId, null])) as EquippedQuartzMap,
    equippedMasterQuartzId: null,
    masterQuartzLevel: 1,
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
  masterQuartzSlot?: SlotId,
): OrbmentState {
  if (masterQuartzSlot !== undefined && slotId === masterQuartzSlot) {
    return state
  }

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

  if (quartzFitsSlotRestriction(equippedQuartz, restriction)) {
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

export type EquipQuartzContext = {
  masterQuartzSlot?: SlotId
  lines?: OrbmentLine[]
  ruleSet?: OrbmentRuleSetId
}

export function setEquippedQuartz(
  state: OrbmentState,
  slotId: SlotId,
  quartzId: number | null,
  quartzById: Map<number, Quartz>,
  context: EquipQuartzContext | SlotId = {},
): OrbmentState {
  const options = typeof context === 'number' ? { masterQuartzSlot: context } : context
  if (options.masterQuartzSlot !== undefined && slotId === options.masterQuartzSlot) {
    return state
  }

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
  if (!quartzFitsSlotRestriction(quartz, restriction)) {
    return state
  }

  if (isColdSteelRuleSet(options.ruleSet)) {
    if (!canEquipColdSteelIQuartz(quartz, slotId, state.equippedQuartz, quartzById, options.lines ?? [])) {
      return state
    }
    if (options.ruleSet === 'cold-steel-ii') {
      const nodeTier = state.nodeTiers[slotId]
      if (quartz.tier && quartz.tier > nodeTier) {
        return state
      }
    }
  } else {
    const nodeTier = state.nodeTiers[slotId]
    if (quartz.tier && quartz.tier > nodeTier) {
      return state
    }

    if (quartz.exclusive_groups.length > 0) {
      const usedGroups = getUsedExclusiveGroups(state.equippedQuartz, quartzById, slotId)
      if (quartz.exclusive_groups.some((group) => usedGroups.has(group))) {
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
  context: Pick<EquipQuartzContext, 'lines' | 'ruleSet'> = {},
): Quartz[] {
  const restriction = restrictions[slotId]
  const currentQuartzId = equippedQuartz[slotId]
  const usedGroups = getUsedExclusiveGroups(equippedQuartz, quartzById, slotId)

  return quartzList.filter((quartz) => {
    if (!quartzFitsSlotRestriction(quartz, restriction)) {
      return false
    }

    if (currentQuartzId === quartz.id) {
      return true
    }

    if (isColdSteelRuleSet(context.ruleSet)) {
      if (!canEquipColdSteelIQuartz(quartz, slotId, equippedQuartz, quartzById, context.lines ?? [])) {
        return false
      }
      if (context.ruleSet === 'cold-steel-ii') {
        const nodeTier = nodeTiers[slotId]
        if (quartz.tier && quartz.tier > nodeTier) {
          return false
        }
      }
      return true
    }

    const nodeTier = nodeTiers[slotId]
    if (quartz.tier && quartz.tier > nodeTier) {
      return false
    }

    if (quartz.exclusive_groups.length === 0) {
      return true
    }

    return !quartz.exclusive_groups.some((group) => usedGroups.has(group))
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

export function setEquippedMasterQuartz(
  state: OrbmentState,
  masterQuartzId: number | null,
  masterQuartzById: Map<number, MasterQuartz>,
): OrbmentState {
  if (!masterQuartzId) {
    return {
      ...state,
      equippedMasterQuartzId: null,
    }
  }

  const masterQuartz = masterQuartzById.get(masterQuartzId)
  if (!masterQuartz) {
    return state
  }

  return {
    ...state,
    equippedMasterQuartzId: masterQuartzId,
    masterQuartzLevel: clampMasterQuartzLevel(masterQuartz, state.masterQuartzLevel),
  }
}

export function setMasterQuartzLevel(
  state: OrbmentState,
  level: number,
  masterQuartzById: Map<number, MasterQuartz>,
): OrbmentState {
  const masterQuartz = state.equippedMasterQuartzId
    ? masterQuartzById.get(state.equippedMasterQuartzId)
    : null
  if (!masterQuartz || !masterQuartz.levels.some((entry) => entry.level === level)) {
    return state
  }

  return {
    ...state,
    masterQuartzLevel: level,
  }
}

export function getMasterQuartzLevelData(
  masterQuartz: MasterQuartz | null | undefined,
  level: number,
): MasterQuartzLevel | null {
  if (!masterQuartz) {
    return null
  }
  return masterQuartz.levels.find((entry) => entry.level === level) ?? null
}

export function clampMasterQuartzLevel(masterQuartz: MasterQuartz, level: number): number {
  if (masterQuartz.levels.some((entry) => entry.level === level)) {
    return level
  }
  return masterQuartz.levels[0]?.level ?? 1
}

export function setNodeTier(
  state: OrbmentState,
  slotId: SlotId,
  tier: number,
  quartzById: Map<number, Quartz>,
  masterQuartzSlot?: SlotId,
): OrbmentState {
  if (masterQuartzSlot !== undefined && slotId === masterQuartzSlot) {
    return state
  }

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
    for (const group of quartz?.exclusive_groups ?? []) {
      groups.add(group)
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
