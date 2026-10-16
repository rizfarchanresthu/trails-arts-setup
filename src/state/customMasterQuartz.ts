import type { MasterQuartzSchema } from '../domain/masterQuartzSchemas'
import {
  ELEMENTS,
  EXPORTED_MASTER_QUARTZ_KIND,
  EXPORTED_MASTER_QUARTZ_VERSION,
  type CustomMasterQuartzEntry,
  type CustomMasterQuartzStorage,
  type ElementName,
  type ElementRequirement,
  type ExportedMasterQuartz,
  type MasterQuartz,
  type MasterQuartzEffect,
  type MasterQuartzLevel,
} from '../domain/types'

const STORAGE_KEY = 'trails-arts-gallery:custom-master-quartz'
const STORAGE_VERSION = 1
export const CUSTOM_MASTER_QUARTZ_ID_START = 10001

export function listCustomMasterQuartz(baseGame?: string): CustomMasterQuartzEntry[] {
  const entries = readStorage().entries
  return baseGame ? entries.filter((entry) => entry.baseGame === baseGame) : entries
}

export function createCustomMasterQuartz(baseGame: string, masterQuartz: MasterQuartz): CustomMasterQuartzEntry {
  const storage = readStorage()
  const now = new Date().toISOString()
  const usedIds = storage.entries
    .filter((entry) => entry.baseGame === baseGame)
    .map((entry) => entry.masterQuartz.id)
  const nextId = Math.max(CUSTOM_MASTER_QUARTZ_ID_START - 1, ...usedIds) + 1
  const next: CustomMasterQuartzEntry = {
    baseGame,
    created_at: now,
    edited_at: now,
    masterQuartz: toStoredMasterQuartz({ ...masterQuartz, id: nextId }),
  }
  writeStorage({ ...storage, entries: [next, ...storage.entries] })
  return next
}

export function updateCustomMasterQuartz(
  baseGame: string,
  id: number,
  masterQuartz: MasterQuartz,
): CustomMasterQuartzEntry | null {
  const storage = readStorage()
  const target = storage.entries.find((entry) => entry.baseGame === baseGame && entry.masterQuartz.id === id)
  if (!target) {
    return null
  }

  const updatedEntry: CustomMasterQuartzEntry = {
    ...target,
    edited_at: new Date().toISOString(),
    masterQuartz: toStoredMasterQuartz({ ...masterQuartz, id }),
  }
  writeStorage({
    ...storage,
    entries: [updatedEntry, ...storage.entries.filter((entry) => entry !== target)],
  })
  return updatedEntry
}

export function deleteCustomMasterQuartz(baseGame: string, id: number): void {
  const storage = readStorage()
  writeStorage({
    ...storage,
    entries: storage.entries.filter((entry) => !(entry.baseGame === baseGame && entry.masterQuartz.id === id)),
  })
}

export function buildExportedMasterQuartz(baseGame: string, masterQuartz: MasterQuartz): ExportedMasterQuartz {
  return {
    kind: EXPORTED_MASTER_QUARTZ_KIND,
    version: EXPORTED_MASTER_QUARTZ_VERSION,
    baseGame,
    exported_at: new Date().toISOString(),
    masterQuartz: toStoredMasterQuartz(masterQuartz),
  }
}

export function parseExportedMasterQuartz(value: unknown): ExportedMasterQuartz | null {
  if (!isRecord(value)) {
    return null
  }
  if (value.kind !== EXPORTED_MASTER_QUARTZ_KIND || value.version !== EXPORTED_MASTER_QUARTZ_VERSION) {
    return null
  }
  if (typeof value.baseGame !== 'string' || typeof value.exported_at !== 'string') {
    return null
  }
  const masterQuartz = parseMasterQuartz(value.masterQuartz)
  if (!masterQuartz) {
    return null
  }
  return {
    kind: EXPORTED_MASTER_QUARTZ_KIND,
    version: EXPORTED_MASTER_QUARTZ_VERSION,
    baseGame: value.baseGame,
    exported_at: value.exported_at,
    masterQuartz,
  }
}

export function validateMasterQuartz(
  masterQuartz: MasterQuartz,
  schema: MasterQuartzSchema,
  validArtIds: Set<number> = new Set(),
): string | null {
  if (!masterQuartz.name.en.trim()) {
    return 'English name is required.'
  }
  if (!ELEMENTS.includes(masterQuartz.element)) {
    return 'Select a valid element.'
  }
  if (masterQuartz.levels.length < 1 || masterQuartz.levels.length > schema.maxLevels) {
    return `Master quartz must have between 1 and ${schema.maxLevels} levels.`
  }
  for (const [index, level] of masterQuartz.levels.entries()) {
    if (level.level !== index + 1) {
      return 'Levels must be numbered consecutively from 1.'
    }
    if (schema.levelFields.includes('elemental_value')) {
      for (const requirement of level.elemental_value ?? []) {
        if (!requirement.element || !ELEMENTS.includes(requirement.element)) {
          return `Level ${level.level}: every elemental value needs an element.`
        }
        if (!Number.isInteger(requirement.value) || requirement.value <= 0) {
          return `Level ${level.level}: elemental values must be whole numbers greater than 0.`
        }
      }
    }
    if (schema.levelFields.includes('arts_learnt')) {
      for (const artId of level.arts_learnt ?? []) {
        if (!Number.isInteger(artId) || artId < 1) {
          return `Level ${level.level}: every arts learnt entry must be a valid art.`
        }
        if (validArtIds.size > 0 && !validArtIds.has(artId)) {
          return `Level ${level.level}: art id ${artId} is not in this base's arts list.`
        }
      }
    }
    if (schema.levelFields.includes('effects')) {
      if (level.effects.some((effect) => !effect.title.trim())) {
        return `Level ${level.level}: every effect needs a title.`
      }
    }
  }
  return null
}

function toStoredMasterQuartz(masterQuartz: MasterQuartz): MasterQuartz {
  return {
    id: masterQuartz.id,
    name: { en: masterQuartz.name.en.trim(), ja: masterQuartz.name.ja.trim() },
    element: masterQuartz.element,
    image_url: masterQuartz.image_url?.trim() || null,
    description: masterQuartz.description.trim(),
    levels: masterQuartz.levels.map((level) => {
      const stored: MasterQuartzLevel = {
        level: level.level,
        effects: level.effects.map((effect) => ({ title: effect.title.trim(), detail: effect.detail.trim() })),
      }
      if (level.elemental_value) {
        stored.elemental_value = level.elemental_value.map((requirement) => ({ ...requirement }))
      }
      if (level.arts_learnt) {
        stored.arts_learnt = [...level.arts_learnt]
      }
      return stored
    }),
  }
}

function readStorage(): CustomMasterQuartzStorage {
  if (typeof window === 'undefined') {
    return createEmptyStorage()
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return createEmptyStorage()
  }

  try {
    return normalizeStorage(JSON.parse(raw) as unknown)
  } catch {
    return createEmptyStorage()
  }
}

function writeStorage(storage: CustomMasterQuartzStorage): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
}

function createEmptyStorage(): CustomMasterQuartzStorage {
  return {
    version: STORAGE_VERSION,
    entries: [],
  }
}

function normalizeStorage(value: unknown): CustomMasterQuartzStorage {
  if (!isRecord(value) || value.version !== STORAGE_VERSION || !Array.isArray(value.entries)) {
    return createEmptyStorage()
  }

  const entries = value.entries
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is CustomMasterQuartzEntry => entry !== null)
    .sort((left, right) => right.edited_at.localeCompare(left.edited_at))

  return {
    version: STORAGE_VERSION,
    entries,
  }
}

function normalizeEntry(value: unknown): CustomMasterQuartzEntry | null {
  if (!isRecord(value)) {
    return null
  }
  if (typeof value.baseGame !== 'string' || typeof value.created_at !== 'string' || typeof value.edited_at !== 'string') {
    return null
  }
  const masterQuartz = parseMasterQuartz(value.masterQuartz)
  if (!masterQuartz || masterQuartz.id < CUSTOM_MASTER_QUARTZ_ID_START) {
    return null
  }
  return {
    baseGame: value.baseGame,
    created_at: value.created_at,
    edited_at: value.edited_at,
    masterQuartz,
  }
}

function parseMasterQuartz(value: unknown): MasterQuartz | null {
  if (!isRecord(value) || !isRecord(value.name)) {
    return null
  }
  const element = toElementName(value.element)
  if (!element || typeof value.name.en !== 'string' || !Array.isArray(value.levels)) {
    return null
  }

  const levels: MasterQuartzLevel[] = []
  for (const rawLevel of value.levels) {
    const level = parseLevel(rawLevel)
    if (!level) {
      return null
    }
    levels.push(level)
  }
  levels.sort((left, right) => left.level - right.level)

  return {
    id: typeof value.id === 'number' && Number.isInteger(value.id) && value.id > 0 ? value.id : 0,
    name: { en: value.name.en, ja: typeof value.name.ja === 'string' ? value.name.ja : '' },
    element,
    image_url: typeof value.image_url === 'string' ? value.image_url : null,
    description: typeof value.description === 'string' ? value.description : '',
    levels,
  }
}

function parseLevel(value: unknown): MasterQuartzLevel | null {
  if (!isRecord(value)) {
    return null
  }
  const levelNumber = value.level
  if (typeof levelNumber !== 'number' || !Number.isInteger(levelNumber) || levelNumber < 1) {
    return null
  }

  const effects: MasterQuartzEffect[] = Array.isArray(value.effects)
    ? value.effects.filter(isRecord).map((effect) => ({
        title: typeof effect.title === 'string' ? effect.title : '',
        detail: typeof effect.detail === 'string' ? effect.detail : '',
      }))
    : []

  const level: MasterQuartzLevel = { level: levelNumber, effects }

  if (Array.isArray(value.elemental_value)) {
    const requirements: ElementRequirement[] = []
    for (const rawRequirement of value.elemental_value) {
      if (!isRecord(rawRequirement)) {
        return null
      }
      const requirementElement = toElementName(rawRequirement.element)
      const requirementValue = rawRequirement.value
      if (!requirementElement || typeof requirementValue !== 'number' || !Number.isFinite(requirementValue)) {
        return null
      }
      requirements.push({ element: requirementElement, value: requirementValue })
    }
    level.elemental_value = requirements
  }

  if (Array.isArray(value.arts_learnt)) {
    level.arts_learnt = value.arts_learnt.filter(
      (entry): entry is number => typeof entry === 'number' && Number.isInteger(entry) && entry >= 1,
    )
  }

  return level
}

function toElementName(value: unknown): ElementName | null {
  return ELEMENTS.find((element) => element === value) ?? null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
