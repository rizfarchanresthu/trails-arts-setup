import {
  clampLineCount,
  createDefaultArcLengths,
  createDefaultLineDirections,
  createDefaultLineStarts,
} from '../domain/rules/skyFcRules'
import { type SavedQuartzSetup, type SavedQuartzSetupStorage, type SlotId } from '../domain/types'
import { createInitialOrbmentState, type OrbmentState } from './orbmentState'

const STORAGE_KEY = 'trails-arts-gallery:saved-quartz-setups'
const STORAGE_VERSION = 1
const SLOT_IDS: SlotId[] = [1, 2, 3, 4, 5, 6]

type SaveAsInput = {
  baseGame: string
  name: string
  orbmentState: OrbmentState
}

type SaveInput = {
  baseGame: string
  name: string
  orbmentState: OrbmentState
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
    orbmentState: sanitizeOrbmentState(input.orbmentState),
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
    orbmentState: sanitizeOrbmentState(input.orbmentState),
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

export function sanitizeForBase(setup: SavedQuartzSetup, validQuartzIds: Set<number>): SavedQuartzSetup {
  const equippedQuartz: OrbmentState['equippedQuartz'] = { ...setup.orbmentState.equippedQuartz }
  for (const slotId of SLOT_IDS) {
    const quartzId = equippedQuartz[slotId]
    if (quartzId !== null && !validQuartzIds.has(quartzId)) {
      equippedQuartz[slotId] = null
    }
  }

  return {
    ...setup,
    orbmentState: {
      ...setup.orbmentState,
      equippedQuartz,
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

  const defaultState = createInitialOrbmentState()
  return {
    ...defaultState,
    lineCount,
    lineStarts,
    lineDirections,
    arcLengths,
    slotRestrictions: normalizeRestrictionMap(value.slotRestrictions),
    equippedQuartz: normalizeEquippedMap(value.equippedQuartz),
  }
}

function sanitizeOrbmentState(state: OrbmentState): OrbmentState {
  const safeLineCount = clampLineCount(Math.floor(state.lineCount))
  const lineStarts = createDefaultLineStarts(safeLineCount)
  const lineDirections = createDefaultLineDirections(safeLineCount)
  const arcLengths = createDefaultArcLengths(safeLineCount)

  for (let index = 0; index < safeLineCount; index += 1) {
    if (state.lineStarts[index] && SLOT_IDS.includes(state.lineStarts[index])) {
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

  return {
    lineCount: safeLineCount,
    lineStarts,
    lineDirections,
    arcLengths,
    slotRestrictions: normalizeRestrictionMap(state.slotRestrictions),
    equippedQuartz: normalizeEquippedMap(state.equippedQuartz),
  }
}

function normalizeRestrictionMap(value: unknown): OrbmentState['slotRestrictions'] {
  const normalized: OrbmentState['slotRestrictions'] = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
  }

  if (!isRecord(value)) {
    return normalized
  }

  for (const slotId of SLOT_IDS) {
    const raw = value[String(slotId)]
    if (typeof raw === 'string') {
      normalized[slotId] = raw as OrbmentState['slotRestrictions'][SlotId]
    }
  }

  return normalized
}

function normalizeEquippedMap(value: unknown): OrbmentState['equippedQuartz'] {
  const normalized: OrbmentState['equippedQuartz'] = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
  }

  if (!isRecord(value)) {
    return normalized
  }

  for (const slotId of SLOT_IDS) {
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
    if (!SLOT_IDS.includes(entry as SlotId)) {
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
