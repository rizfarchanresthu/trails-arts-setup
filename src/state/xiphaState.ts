import {
  XIPHA_LINE_TYPES,
  XIPHA_MAX_LINE_SLOTS,
  XIPHA_MIN_LINE_SLOTS,
  getXiphaLineType,
  getXiphaSlotIndex,
  quartzFitsSlotRestriction,
  quartzFitsXiphaSlot,
  type ElementName,
  type OrbmentTopology,
  type Quartz,
  type SlotId,
  type XiphaLineSlotCount,
  type XiphaLineType,
} from '../domain/types'
import {
  createInitialOrbmentState,
  getUsedExclusiveGroups,
  type OrbmentState,
  type SlotElementRestrictionShape,
  type XiphaState,
} from './orbmentState'

export type XiphaPresetShape = {
  lineSlotCounts: Record<XiphaLineType, XiphaLineSlotCount>
}

export function createInitialXiphaState(): XiphaState {
  return {
    lineSlotCounts: createLineSlotCounts(XIPHA_MAX_LINE_SLOTS),
    holoCoreId: null,
    artsDriverId: null,
  }
}

export function createInitialXiphaOrbmentState(topology: OrbmentTopology): OrbmentState {
  return {
    ...createInitialOrbmentState(topology),
    xipha: createInitialXiphaState(),
  }
}

export function getXiphaState(state: OrbmentState): XiphaState {
  return state.xipha ?? createInitialXiphaState()
}

export function isXiphaSlotActive(xipha: XiphaState, slotId: SlotId): boolean {
  const lineType = getXiphaLineType(slotId)
  return lineType !== null && getXiphaSlotIndex(slotId) <= xipha.lineSlotCounts[lineType]
}

export function getXiphaTotalSlotCount(xipha: XiphaState): number {
  return XIPHA_LINE_TYPES.reduce((sum, lineType) => sum + xipha.lineSlotCounts[lineType], 0)
}

export function setXiphaLineSlotCount(
  state: OrbmentState,
  lineType: XiphaLineType,
  count: number,
): OrbmentState {
  const safeCount = clampLineSlotCount(count)
  const xipha = getXiphaState(state)
  const nextXipha: XiphaState = {
    ...xipha,
    lineSlotCounts: { ...xipha.lineSlotCounts, [lineType]: safeCount },
  }
  return clearInactiveSlots({ ...state, xipha: nextXipha })
}

export function setXiphaHoloCore(state: OrbmentState, holoCoreId: number | null): OrbmentState {
  return { ...state, xipha: { ...getXiphaState(state), holoCoreId } }
}

export function setXiphaArtsDriver(state: OrbmentState, artsDriverId: number | null): OrbmentState {
  return { ...state, xipha: { ...getXiphaState(state), artsDriverId } }
}

export function setXiphaSlotRestriction(
  state: OrbmentState,
  slotId: SlotId,
  restriction: ElementName | null,
  quartzById: Map<number, Quartz>,
): OrbmentState {
  if (!isXiphaSlotActive(getXiphaState(state), slotId)) {
    return state
  }

  const equippedId = state.equippedQuartz[slotId]
  const equipped = equippedId ? quartzById.get(equippedId) : null
  const keepsQuartz = !equipped || quartzFitsSlotRestriction(equipped, restriction)

  return {
    ...state,
    slotRestrictions: { ...state.slotRestrictions, [slotId]: restriction },
    equippedQuartz: keepsQuartz ? state.equippedQuartz : { ...state.equippedQuartz, [slotId]: null },
  }
}

export function canEquipXiphaQuartz(
  quartz: Quartz,
  slotId: SlotId,
  state: OrbmentState,
  quartzById: Map<number, Quartz>,
): boolean {
  if (!isXiphaSlotActive(getXiphaState(state), slotId)) {
    return false
  }
  if (!quartzFitsXiphaSlot(quartz, slotId)) {
    return false
  }
  if (!quartzFitsSlotRestriction(quartz, state.slotRestrictions[slotId])) {
    return false
  }
  if (state.equippedQuartz[slotId] === quartz.id) {
    return true
  }
  if (quartz.exclusive_groups.length === 0) {
    return true
  }
  const usedGroups = getUsedExclusiveGroups(state.equippedQuartz, quartzById, slotId)
  return !quartz.exclusive_groups.some((group) => usedGroups.has(group))
}

export function getAllowedQuartzForXiphaSlot(
  quartzList: Quartz[],
  slotId: SlotId,
  state: OrbmentState,
  quartzById: Map<number, Quartz>,
): Quartz[] {
  return quartzList.filter((quartz) => canEquipXiphaQuartz(quartz, slotId, state, quartzById))
}

export function setEquippedXiphaQuartz(
  state: OrbmentState,
  slotId: SlotId,
  quartzId: number | null,
  quartzById: Map<number, Quartz>,
): OrbmentState {
  if (!quartzId) {
    return { ...state, equippedQuartz: { ...state.equippedQuartz, [slotId]: null } }
  }

  const quartz = quartzById.get(quartzId)
  if (!quartz || !canEquipXiphaQuartz(quartz, slotId, state, quartzById)) {
    return state
  }

  return { ...state, equippedQuartz: { ...state.equippedQuartz, [slotId]: quartzId } }
}

export function createXiphaStateFromPreset(
  preset: XiphaPresetShape,
  restriction: SlotElementRestrictionShape,
  topology: OrbmentTopology,
): OrbmentState {
  const initial = createInitialXiphaOrbmentState(topology)
  const slotRestrictions = { ...initial.slotRestrictions }
  const restrictionGroups = !restriction ? [] : Array.isArray(restriction) ? restriction : [restriction]
  for (const group of restrictionGroups) {
    for (const slotId of group.slots) {
      if (slotId in slotRestrictions) {
        slotRestrictions[slotId] = group.element
      }
    }
  }

  return clearInactiveSlots({
    ...initial,
    slotRestrictions,
    xipha: {
      ...createInitialXiphaState(),
      lineSlotCounts: { ...preset.lineSlotCounts },
    },
  })
}

export function sanitizeXiphaState(
  value: unknown,
  validHoloCoreIds?: Set<number>,
  validArtsDriverIds?: Set<number>,
): XiphaState {
  const fallback = createInitialXiphaState()
  if (typeof value !== 'object' || value === null) {
    return fallback
  }

  const record = value as Record<string, unknown>
  const rawCounts =
    typeof record.lineSlotCounts === 'object' && record.lineSlotCounts !== null
      ? (record.lineSlotCounts as Record<string, unknown>)
      : {}
  const lineSlotCounts = { ...fallback.lineSlotCounts }
  for (const lineType of XIPHA_LINE_TYPES) {
    const raw = rawCounts[lineType]
    if (typeof raw === 'number' && Number.isInteger(raw)) {
      lineSlotCounts[lineType] = clampLineSlotCount(raw)
    }
  }

  return {
    lineSlotCounts,
    holoCoreId: sanitizeOptionalId(record.holoCoreId, validHoloCoreIds),
    artsDriverId: sanitizeOptionalId(record.artsDriverId, validArtsDriverIds),
  }
}

export function clearInactiveSlots(state: OrbmentState): OrbmentState {
  const xipha = getXiphaState(state)
  const equippedQuartz = { ...state.equippedQuartz }
  const slotRestrictions = { ...state.slotRestrictions }
  for (const key of Object.keys(equippedQuartz)) {
    const slotId = Number(key) as SlotId
    if (!isXiphaSlotActive(xipha, slotId)) {
      equippedQuartz[slotId] = null
      slotRestrictions[slotId] = null
    }
  }
  return { ...state, equippedQuartz, slotRestrictions }
}

export function clampLineSlotCount(count: number): XiphaLineSlotCount {
  return count <= XIPHA_MIN_LINE_SLOTS ? XIPHA_MIN_LINE_SLOTS : XIPHA_MAX_LINE_SLOTS
}

function createLineSlotCounts(count: XiphaLineSlotCount): Record<XiphaLineType, XiphaLineSlotCount> {
  return Object.fromEntries(XIPHA_LINE_TYPES.map((lineType) => [lineType, count])) as Record<
    XiphaLineType,
    XiphaLineSlotCount
  >
}

function sanitizeOptionalId(value: unknown, validIds?: Set<number>): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return null
  }
  if (validIds && !validIds.has(value)) {
    return null
  }
  return value
}
