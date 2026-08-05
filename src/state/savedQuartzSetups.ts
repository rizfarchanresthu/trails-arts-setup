import {
  clampLineCount,
  createDefaultArcLengths,
  createDefaultLineDirections,
  createDefaultLineStarts,
} from '../domain/rules/skyFcRules'
import {
  EXPORTED_SETUP_KIND,
  EXPORTED_SETUP_VERSION,
  type ExportedQuartzSetup,
  type OrbmentTopology,
  type SavedQuartzSetup,
  type SavedQuartzSetupStorage,
  type SlotId,
} from '../domain/types'
import { createInitialOrbmentState, type OrbmentState } from './orbmentState'

const STORAGE_KEY = 'trails-arts-gallery:saved-quartz-setups'
const STORAGE_VERSION = 1
type SaveAsInput = {
  baseGame: string
  name: string
  orbmentState: OrbmentState
  topology: OrbmentTopology
}

type SaveInput = {
  baseGame: string
  name: string
  orbmentState: OrbmentState
  topology: OrbmentTopology
}

export function listSavedQuartzSetups(): SavedQuartzSetup[] {
  return readStorage().setups
}

export function getSavedQuartzSetupById(id: string): SavedQuartzSetup | null {
  return readStorage().setups.find((setup) => setup.id === id) ?? null
}

export function createSavedQuartzSetup(input: SaveAsInput): SavedQuartzSetup {
  const now = new Date().toISOString()
  const next: SavedQuartzSetup = {
    id: crypto.randomUUID(),
    baseGame: input.baseGame,
    name: input.name.trim(),
    created_at: now,
    edited_at: now,
    orbmentState: sanitizeOrbmentState(input.orbmentState, input.topology),
  }

  const storage = readStorage()
  const updated: SavedQuartzSetupStorage = {
    ...storage,
    setups: [next, ...storage.setups],
  }
  writeStorage(updated)
  return next
}

export function updateSavedQuartzSetup(id: string, input: SaveInput): SavedQuartzSetup | null {
  const storage = readStorage()
  const target = storage.setups.find((setup) => setup.id === id)
  if (!target) {
    return null
  }

  const updatedSetup: SavedQuartzSetup = {
    ...target,
    baseGame: input.baseGame,
    name: input.name.trim(),
    edited_at: new Date().toISOString(),
    orbmentState: sanitizeOrbmentState(input.orbmentState, input.topology),
  }

  const updated: SavedQuartzSetupStorage = {
    ...storage,
    setups: [updatedSetup, ...storage.setups.filter((setup) => setup.id !== id)],
  }
  writeStorage(updated)
  return updatedSetup
}

export function deleteSavedQuartzSetup(id: string): void {
  const storage = readStorage()
  const updated: SavedQuartzSetupStorage = {
    ...storage,
    setups: storage.setups.filter((setup) => setup.id !== id),
  }
  writeStorage(updated)
}

export function buildExportedSetup(input: {
  baseGame: string
  templateId: string | null
  name: string
  orbmentState: OrbmentState
}): ExportedQuartzSetup {
  return {
    kind: EXPORTED_SETUP_KIND,
    version: EXPORTED_SETUP_VERSION,
    baseGame: input.baseGame,
    templateId: input.templateId && input.templateId.length > 0 ? input.templateId : null,
    name: input.name.trim() || 'Untitled setup',
    exported_at: new Date().toISOString(),
    orbmentState: input.orbmentState,
  }
}

export function parseExportedSetup(value: unknown): ExportedQuartzSetup | null {
  if (!isRecord(value)) {
    return null
  }
  if (value.kind !== EXPORTED_SETUP_KIND || value.version !== EXPORTED_SETUP_VERSION) {
    return null
  }
  if (typeof value.baseGame !== 'string' || typeof value.name !== 'string' || typeof value.exported_at !== 'string') {
    return null
  }
  if (value.templateId !== null && value.templateId !== undefined && typeof value.templateId !== 'string') {
    return null
  }

  const state = normalizeOrbmentState(value.orbmentState)
  if (!state) {
    return null
  }

  return {
    kind: EXPORTED_SETUP_KIND,
    version: EXPORTED_SETUP_VERSION,
    baseGame: value.baseGame,
    templateId: typeof value.templateId === 'string' && value.templateId.length > 0 ? value.templateId : null,
    name: value.name,
    exported_at: value.exported_at,
    orbmentState: state,
  }
}

export function sanitizeExportedSetup(
  setup: ExportedQuartzSetup,
  validQuartzIds: Set<number>,
  topology: OrbmentTopology,
  validMasterQuartzIds: Set<number> = new Set(),
): ExportedQuartzSetup {
  const sanitizedState = sanitizeOrbmentState(setup.orbmentState, topology)
  const sanitized = sanitizeForBase(
    {
      id: 'imported',
      baseGame: setup.baseGame,
      name: setup.name,
      created_at: setup.exported_at,
      edited_at: setup.exported_at,
      orbmentState: sanitizedState,
    },
    validQuartzIds,
    topology,
    validMasterQuartzIds,
  )

  return {
    ...setup,
    orbmentState: sanitized.orbmentState,
  }
}

export function sanitizeForBase(
  setup: SavedQuartzSetup,
  validQuartzIds: Set<number>,
  topology: OrbmentTopology,
  validMasterQuartzIds: Set<number> = new Set(),
): SavedQuartzSetup {
  const equippedQuartz: OrbmentState['equippedQuartz'] = { ...setup.orbmentState.equippedQuartz }
  for (const slotId of topology.slotIds) {
    const quartzId = equippedQuartz[slotId]
    if (quartzId !== null && !validQuartzIds.has(quartzId)) {
      equippedQuartz[slotId] = null
    }
  }

  if (topology.masterQuartzSlot !== undefined) {
    equippedQuartz[topology.masterQuartzSlot] = null
  }

  const equippedMasterQuartzId = setup.orbmentState.equippedMasterQuartzId
  const sanitizedMasterQuartzId =
    equippedMasterQuartzId !== null && validMasterQuartzIds.has(equippedMasterQuartzId)
      ? equippedMasterQuartzId
      : null

  return {
    ...setup,
    orbmentState: {
      ...setup.orbmentState,
      equippedQuartz,
      equippedMasterQuartzId: sanitizedMasterQuartzId,
      masterQuartzLevel: sanitizedMasterQuartzId ? setup.orbmentState.masterQuartzLevel : 1,
    },
  }
}

function readStorage(): SavedQuartzSetupStorage {
  if (typeof window === 'undefined') {
    return createEmptyStorage()
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return createEmptyStorage()
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    return normalizeStorage(parsed)
  } catch {
    return createEmptyStorage()
  }
}

function writeStorage(storage: SavedQuartzSetupStorage): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
}

function createEmptyStorage(): SavedQuartzSetupStorage {
  return {
    version: STORAGE_VERSION,
    setups: [],
  }
}

function normalizeStorage(value: unknown): SavedQuartzSetupStorage {
  if (!isRecord(value) || value.version !== STORAGE_VERSION || !Array.isArray(value.setups)) {
    return createEmptyStorage()
  }

  const setups = value.setups
    .map((entry) => normalizeSavedSetup(entry))
    .filter((entry): entry is SavedQuartzSetup => entry !== null)
    .sort((left, right) => right.edited_at.localeCompare(left.edited_at))

  return {
    version: STORAGE_VERSION,
    setups,
  }
}

function normalizeSavedSetup(value: unknown): SavedQuartzSetup | null {
  if (!isRecord(value)) {
    return null
  }
  if (
    typeof value.id !== 'string' ||
    typeof value.baseGame !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.created_at !== 'string' ||
    typeof value.edited_at !== 'string'
  ) {
    return null
  }

  const state = normalizeOrbmentState(value.orbmentState)
  if (!state) {
    return null
  }

  return {
    id: value.id,
    baseGame: value.baseGame,
    name: value.name,
    created_at: value.created_at,
    edited_at: value.edited_at,
    orbmentState: state,
  }
}

function normalizeOrbmentState(value: unknown): OrbmentState | null {
  if (!isRecord(value)) {
    return null
  }

  const lineCount = Number(value.lineCount)
  if (!Number.isInteger(lineCount) || lineCount < 1) {
    return null
  }

  const lineStarts = toSlotIdArray(value.lineStarts)
  const lineDirections = toLineDirectionArray(value.lineDirections)
  const arcLengths = toNumberArray(value.arcLengths)

  if (lineStarts.length !== lineCount || lineDirections.length !== lineCount || arcLengths.length !== lineCount) {
    return null
  }

  const slotIds = getSlotIdsFromMaps(value)
  const topology = createFallbackTopology(slotIds)
  const safeLineCount = clampLineCount(lineCount, topology.maxLines)
  const defaultState = createInitialOrbmentState(topology)
  return {
    ...defaultState,
    lineCount: safeLineCount,
    lineStarts,
    lineDirections,
    arcLengths,
    slotRestrictions: normalizeRestrictionMap(value.slotRestrictions, topology.slotIds),
    equippedQuartz: normalizeEquippedMap(value.equippedQuartz, topology.slotIds),
    nodeTiers: normalizeNodeTiersMap(value.nodeTiers, topology.slotIds, defaultState.nodeTiers),
    equippedMasterQuartzId: normalizeOptionalId(value.equippedMasterQuartzId),
    masterQuartzLevel: normalizePositiveInt(value.masterQuartzLevel) ?? 1,
  }
}

function sanitizeOrbmentState(state: OrbmentState, topology: OrbmentTopology): OrbmentState {
  const safeLineCount = clampLineCount(Math.floor(state.lineCount), topology.maxLines)
  const lineStarts = createDefaultLineStarts(safeLineCount, topology)
  const lineDirections = createDefaultLineDirections(safeLineCount, topology.maxLines)
  const arcLengths = createDefaultArcLengths(safeLineCount, topology)

  for (let index = 0; index < safeLineCount; index += 1) {
    if (state.lineStarts[index] && topology.outerSlots.includes(state.lineStarts[index])) {
      lineStarts[index] = state.lineStarts[index]
    }
    if (state.lineDirections[index] === 'cw' || state.lineDirections[index] === 'ccw') {
      lineDirections[index] = state.lineDirections[index]
    }
    const rawLength = state.arcLengths[index]
    if (Number.isInteger(rawLength) && rawLength > 0) {
      arcLengths[index] = rawLength
    }
  }

  const sanitized: OrbmentState = {
    lineCount: safeLineCount,
    lineStarts,
    lineDirections,
    arcLengths,
    slotRestrictions: normalizeRestrictionMap(state.slotRestrictions, topology.slotIds),
    equippedQuartz: normalizeEquippedMap(state.equippedQuartz, topology.slotIds),
    nodeTiers: normalizeNodeTiersMap(state.nodeTiers, topology.slotIds, topology.nodeTierDefaults),
    equippedMasterQuartzId: normalizeOptionalId(state.equippedMasterQuartzId),
    masterQuartzLevel: Number.isInteger(state.masterQuartzLevel) && state.masterQuartzLevel >= 1
      ? state.masterQuartzLevel
      : 1,
  }

  if (topology.masterQuartzSlot !== undefined) {
    sanitized.equippedQuartz[topology.masterQuartzSlot] = null
    sanitized.slotRestrictions[topology.masterQuartzSlot] = null
  } else {
    sanitized.equippedMasterQuartzId = null
    sanitized.masterQuartzLevel = 1
  }

  return sanitized
}

function normalizeOptionalId(value: unknown): number | null {
  if (value === null) {
    return null
  }
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }
  return null
}

function normalizePositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
    return value
  }
  return null
}

function normalizeRestrictionMap(value: unknown, slotIds: SlotId[]): OrbmentState['slotRestrictions'] {
  const normalized = Object.fromEntries(slotIds.map((slotId) => [slotId, null])) as OrbmentState['slotRestrictions']

  if (!isRecord(value)) {
    return normalized
  }

  for (const slotId of slotIds) {
    const raw = value[String(slotId)]
    if (typeof raw === 'string') {
      normalized[slotId] = raw as OrbmentState['slotRestrictions'][SlotId]
    }
  }

  return normalized
}

function normalizeEquippedMap(value: unknown, slotIds: SlotId[]): OrbmentState['equippedQuartz'] {
  const normalized = Object.fromEntries(slotIds.map((slotId) => [slotId, null])) as OrbmentState['equippedQuartz']

  if (!isRecord(value)) {
    return normalized
  }

  for (const slotId of slotIds) {
    const raw = value[String(slotId)]
    if (raw === null) {
      normalized[slotId] = null
      continue
    }
    if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
      normalized[slotId] = raw
    }
  }

  return normalized
}

function toSlotIdArray(value: unknown): SlotId[] {
  if (!Array.isArray(value)) {
    return []
  }
  const output: SlotId[] = []
  for (const entry of value) {
    if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 1) {
      return []
    }
    output.push(entry as SlotId)
  }
  return output
}

function toLineDirectionArray(value: unknown): OrbmentState['lineDirections'] {
  if (!Array.isArray(value)) {
    return []
  }
  const output: OrbmentState['lineDirections'] = []
  for (const entry of value) {
    if (entry !== 'cw' && entry !== 'ccw') {
      return []
    }
    output.push(entry)
  }
  return output
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }
  const output: number[] = []
  for (const entry of value) {
    if (!Number.isInteger(entry) || entry <= 0) {
      return []
    }
    output.push(entry)
  }
  return output
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeNodeTiersMap(
  value: unknown,
  slotIds: SlotId[],
  fallbackMap: Record<number, number>,
): OrbmentState['nodeTiers'] {
  const normalized = Object.fromEntries(
    slotIds.map((slotId) => [slotId, fallbackMap[slotId] ?? 1]),
  ) as OrbmentState['nodeTiers']
  if (!isRecord(value)) {
    return normalized
  }
  for (const slotId of slotIds) {
    const raw = value[String(slotId)]
    if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1) {
      normalized[slotId] = raw
    }
  }
  return normalized
}

function getSlotIdsFromMaps(value: Record<string, unknown>): SlotId[] {
  const slotIds = new Set<number>()
  for (const key of ['slotRestrictions', 'equippedQuartz', 'nodeTiers']) {
    const mapValue = value[key]
    if (!isRecord(mapValue)) {
      continue
    }
    for (const rawKey of Object.keys(mapValue)) {
      const parsed = Number(rawKey)
      if (Number.isInteger(parsed) && parsed >= 1) {
        slotIds.add(parsed)
      }
    }
  }
  const sorted = Array.from(slotIds).sort((left, right) => left - right)
  return sorted.length > 0 ? (sorted as SlotId[]) : ([1, 2, 3, 4, 5, 6] as SlotId[])
}

function createFallbackTopology(slotIds: SlotId[]): OrbmentTopology {
  const centerSlot = slotIds[0] ?? 1
  const outerSlots = slotIds.filter((slotId) => slotId !== centerSlot)
  const wrapsOuterRing = outerSlots.length >= 6
  const adjacency: Record<number, SlotId[]> = {
    [centerSlot]: outerSlots,
  }
  for (let index = 0; index < outerSlots.length; index += 1) {
    const current = outerSlots[index]
    const neighbors: SlotId[] = [centerSlot]
    const previous = wrapsOuterRing
      ? outerSlots[(index - 1 + outerSlots.length) % outerSlots.length]
      : outerSlots[index - 1]
    const next = wrapsOuterRing
      ? outerSlots[(index + 1) % outerSlots.length]
      : outerSlots[index + 1]
    if (previous !== undefined) {
      neighbors.push(previous)
    }
    if (next !== undefined) {
      neighbors.push(next)
    }
    adjacency[current] = neighbors
  }
  return {
    slotIds,
    centerSlot,
    outerSlots,
    outerDirectionSequence: outerSlots,
    outerAdjacency: adjacency,
    wrapsOuterRing,
    maxLines: Math.max(1, outerSlots.length),
    nodeTierDefaults: Object.fromEntries(slotIds.map((slotId) => [slotId, 1])),
  }
}
