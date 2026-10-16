import {
  XIPHA_LINE_TYPES,
  XIPHA_MAX_LINE_SLOTS,
  XIPHA_MIN_LINE_SLOTS,
  getXiphaLineType,
  getXiphaSlotIndex,
  quartzFitsSlotRestriction,
  quartzFitsXiphaSlot,
  type ArtsDriver,
  type ArtsPlugin,
  type ElementName,
  type HoloCore,
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
    holoCoreLevel: 1,
    artsDriverId: null,
    artsDriverLevel: 1,
    artsPluginIds: [],
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

export function setXiphaHoloCore(
  state: OrbmentState,
  holoCoreId: number | null,
  holoCoresById: Map<number, HoloCore> = new Map(),
): OrbmentState {
  const xipha = getXiphaState(state)
  if (!holoCoreId) {
    return { ...state, xipha: { ...xipha, holoCoreId: null } }
  }
  const holoCore = holoCoresById.get(holoCoreId)
  if (!holoCore) {
    return state
  }
  return {
    ...state,
    xipha: {
      ...xipha,
      holoCoreId,
      holoCoreLevel: clampLeveledEntry(holoCore.levels, xipha.holoCoreLevel),
    },
  }
}

export function setXiphaHoloCoreLevel(
  state: OrbmentState,
  level: number,
  holoCoresById: Map<number, HoloCore>,
): OrbmentState {
  const xipha = getXiphaState(state)
  const holoCore = xipha.holoCoreId ? holoCoresById.get(xipha.holoCoreId) : null
  if (!holoCore || !holoCore.levels.some((entry) => entry.level === level)) {
    return state
  }
  return { ...state, xipha: { ...xipha, holoCoreLevel: level } }
}

export function setXiphaArtsDriver(
  state: OrbmentState,
  artsDriverId: number | null,
  artsDriversById: Map<number, ArtsDriver> = new Map(),
): OrbmentState {
  const xipha = getXiphaState(state)
  if (!artsDriverId) {
    return { ...state, xipha: { ...xipha, artsDriverId: null, artsPluginIds: [] } }
  }
  const artsDriver = artsDriversById.get(artsDriverId)
  if (!artsDriver) {
    return state
  }
  return {
    ...state,
    xipha: {
      ...xipha,
      artsDriverId,
      artsDriverLevel: clampLeveledEntry(artsDriver.levels, xipha.artsDriverLevel),
      artsPluginIds: createEmptyPluginSlots(artsDriver.plugin_slots),
    },
  }
}

export function setXiphaArtsDriverLevel(
  state: OrbmentState,
  level: number,
  artsDriversById: Map<number, ArtsDriver>,
): OrbmentState {
  const xipha = getXiphaState(state)
  const artsDriver = xipha.artsDriverId ? artsDriversById.get(xipha.artsDriverId) : null
  if (!artsDriver || !artsDriver.levels.some((entry) => entry.level === level)) {
    return state
  }
  return { ...state, xipha: { ...xipha, artsDriverLevel: level } }
}

export function setXiphaArtsPlugin(
  state: OrbmentState,
  slotIndex: number,
  pluginId: number | null,
  artsPluginsById: Map<number, ArtsPlugin>,
): OrbmentState {
  const xipha = getXiphaState(state)
  if (slotIndex < 0 || slotIndex >= xipha.artsPluginIds.length) {
    return state
  }
  if (pluginId !== null) {
    if (!artsPluginsById.has(pluginId)) {
      return state
    }
    const duplicate = xipha.artsPluginIds.some(
      (equippedId, index) => index !== slotIndex && equippedId === pluginId,
    )
    if (duplicate) {
      return state
    }
  }
  const artsPluginIds = [...xipha.artsPluginIds]
  artsPluginIds[slotIndex] = pluginId
  return { ...state, xipha: { ...xipha, artsPluginIds } }
}

export function getHoloCoreLevelData(holoCore: HoloCore | null | undefined, level: number) {
  return holoCore?.levels.find((entry) => entry.level === level) ?? null
}

export function getArtsDriverLevelData(artsDriver: ArtsDriver | null | undefined, level: number) {
  return artsDriver?.levels.find((entry) => entry.level === level) ?? null
}

/** Cumulative art names: driver unlocks at/below level, then equipped plugin arts (deduped). */
export function getCumulativeArtsDriverArts(
  artsDriver: ArtsDriver,
  level: number,
  plugins: ArtsPlugin[] = [],
): string[] {
  const seen = new Set<string>()
  const arts: string[] = []
  for (const entry of artsDriver.levels) {
    if (entry.level > level) {
      continue
    }
    for (const art of entry.arts) {
      if (seen.has(art)) {
        continue
      }
      seen.add(art)
      arts.push(art)
    }
  }
  for (const plugin of plugins) {
    const art = plugin.name.en
    if (seen.has(art)) {
      continue
    }
    seen.add(art)
    arts.push(art)
  }
  return arts
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
  for (const [slotKey, equippedId] of Object.entries(state.equippedQuartz)) {
    const equippedSlotId = Number(slotKey) as SlotId
    if (!equippedId || equippedSlotId === slotId) {
      continue
    }
    if (equippedId === quartz.id) {
      return false
    }
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
  validArtsPluginIds?: Set<number>,
  artsDriversById?: Map<number, ArtsDriver>,
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

  const artsDriverId = sanitizeOptionalId(record.artsDriverId, validArtsDriverIds)
  const savedPluginCount =
    Array.isArray(record.artsPluginIds) && record.artsPluginIds.length > 0
      ? record.artsPluginIds.length
      : 0
  const pluginSlotCount = artsDriverId
    ? (artsDriversById?.get(artsDriverId)?.plugin_slots ?? savedPluginCount)
    : 0

  return {
    lineSlotCounts,
    holoCoreId: sanitizeOptionalId(record.holoCoreId, validHoloCoreIds),
    holoCoreLevel: sanitizePositiveInt(record.holoCoreLevel) ?? 1,
    artsDriverId,
    artsDriverLevel: sanitizePositiveInt(record.artsDriverLevel) ?? 1,
    artsPluginIds: sanitizeArtsPluginIds(record.artsPluginIds, pluginSlotCount, validArtsPluginIds),
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

function sanitizePositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
    return value
  }
  return null
}

function clampLeveledEntry(levels: Array<{ level: number }>, level: number): number {
  if (levels.some((entry) => entry.level === level)) {
    return level
  }
  return levels[0]?.level ?? 1
}

function createEmptyPluginSlots(count: number): Array<number | null> {
  const safeCount = Number.isInteger(count) && count > 0 ? count : 0
  return new Array<number | null>(safeCount).fill(null)
}

function sanitizeArtsPluginIds(
  value: unknown,
  slotCount: number,
  validIds?: Set<number>,
): Array<number | null> {
  const slots = createEmptyPluginSlots(slotCount)
  if (!Array.isArray(value) || slotCount <= 0) {
    return slots
  }
  const seen = new Set<number>()
  for (let index = 0; index < slotCount; index += 1) {
    const id = sanitizeOptionalId(value[index], validIds)
    if (id !== null && !seen.has(id)) {
      slots[index] = id
      seen.add(id)
    }
  }
  return slots
}
