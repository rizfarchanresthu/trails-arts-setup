import artsSky3rd from '../database/arts/sky-3rd.json'
import artsSkyFc from '../database/arts/sky-fc.json'
import artsSkySc from '../database/arts/sky-sc.json'
import quartzSky3rd from '../database/quartz/sky-3rd.json'
import quartzSkyFc from '../database/quartz/sky-fc.json'
import quartzSkySc from '../database/quartz/sky-sc.json'
import { ELEMENTS, type Art, type BaseData, type ElementName, type ElementRequirement, type Quartz, type SlotId } from './types'

const SKY_FC_TOPOLOGY: BaseData['topology'] = {
  slotIds: [1, 2, 3, 4, 5, 6],
  centerSlot: 1,
  outerSlots: [2, 3, 4, 5, 6],
  outerDirectionSequence: [2, 3, 4, 5, 6],
  outerAdjacency: {
    1: [2, 3, 4, 5, 6],
    2: [1, 3],
    3: [1, 2, 4],
    4: [1, 3, 5],
    5: [1, 4, 6],
    6: [1, 5],
  },
  wrapsOuterRing: false,
  maxLines: 5,
  nodeTierDefaults: createNodeTierDefaults([1, 2, 3, 4, 5, 6], 99),
}

const SKY_SC_TOPOLOGY: BaseData['topology'] = {
  slotIds: [1, 2, 3, 4, 5, 6, 7],
  centerSlot: 1,
  outerSlots: [2, 3, 4, 5, 6, 7],
  outerDirectionSequence: [2, 3, 4, 5, 6, 7],
  outerAdjacency: {
    1: [2, 3, 4, 5, 6, 7],
    2: [1, 3, 7],
    3: [1, 2, 4],
    4: [1, 3, 5],
    5: [1, 4, 6],
    6: [1, 5, 7],
    7: [1, 6, 2],
  },
  wrapsOuterRing: true,
  maxLines: 6,
  nodeTierDefaults: createNodeTierDefaults([1, 2, 3, 4, 5, 6, 7], 1),
}

const SKY_FC_BASE: BaseData = {
  id: 'sky-fc',
  label: 'Sky FC',
  quartz: quartzSkyFc.map((entry) => normalizeQuartz(entry)),
  arts: artsSkyFc.map((entry) => normalizeArt(entry)),
  topology: SKY_FC_TOPOLOGY,
}

const SKY_SC_BASE: BaseData = {
  id: 'sky-sc',
  label: 'Sky SC',
  quartz: quartzSkySc.map((entry) => normalizeQuartz(entry)),
  arts: artsSkySc.map((entry) => normalizeArt(entry)),
  topology: SKY_SC_TOPOLOGY,
}

const SKY_3RD_BASE: BaseData = {
  id: 'sky-3rd',
  label: 'Sky 3rd',
  quartz: quartzSky3rd.map((entry) => normalizeQuartz(entry)),
  arts: artsSky3rd.map((entry) => normalizeArt(entry)),
  topology: SKY_SC_TOPOLOGY,
}

export const BASES: BaseData[] = [SKY_FC_BASE, SKY_SC_BASE, SKY_3RD_BASE]

export function getBaseById(baseId: string): BaseData {
  const matched = BASES.find((base) => base.id === baseId)
  return matched ?? SKY_FC_BASE
}

function normalizeQuartz(input: unknown): Quartz {
  const record = input as Record<string, unknown>
  return {
    id: Number(record.id),
    name: record.name as Quartz['name'],
    effect: String(record.effect),
    element: toElementName(record.element),
    tier: normalizeTier(record.tier),
    exclusive_groups: normalizeExclusiveGroups(record.exclusive_groups ?? record.exclusive_group),
    elemental_value: normalizeElementalValue(record.elemental_value),
    synthesis_cost: normalizeSynthesisCost(record.synthesis_cost),
  }
}

function normalizeArt(input: unknown): Art {
  const record = input as Record<string, unknown>
  return {
    id: Number(record.id),
    name: record.name as Art['name'],
    image_url: typeof record.image_url === 'string' ? record.image_url : null,
    element: toElementName(record.element),
    category: record.category as Art['category'],
    elemental_value: normalizeRequirementArray(record.elemental_value),
    cost: String(record.cost),
    time: record.time as Art['time'],
    power: record.power as Art['power'],
    target: String(record.target),
    effect: (record.effect as string | null) ?? null,
    description: String(record.description),
  }
}

function normalizeElementalValue(input: unknown): ElementRequirement[] | 'No value' {
  if (input === 'No value') {
    return 'No value'
  }
  return normalizeRequirementArray(input)
}

function normalizeSynthesisCost(input: unknown): ElementRequirement[] | 'Not synthesizable' {
  if (input === 'Not synthesizable') {
    return 'Not synthesizable'
  }
  return normalizeRequirementArray(input)
}

function normalizeRequirementArray(input: unknown): ElementRequirement[] {
  if (!Array.isArray(input)) {
    return []
  }
  return input.map((entry) => normalizeRequirement(entry))
}

function normalizeRequirement(input: unknown): ElementRequirement {
  const record = input as Record<string, unknown>
  const normalized: ElementRequirement = {
    value: Number(record.value),
  }

  if (typeof record.element === 'string') {
    normalized.element = toElementName(record.element)
  }

  if (Array.isArray(record.elements)) {
    normalized.elements = record.elements.map((element) => toElementName(element))
  }

  return normalized
}

function toElementName(value: unknown): ElementName {
  if (typeof value !== 'string') {
    throw new Error(`Unexpected element value: ${String(value)}`)
  }
  const matched = ELEMENTS.find((element) => element === value)
  if (!matched) {
    throw new Error(`Unexpected element value: ${String(value)}`)
  }
  return matched
}

function normalizeTier(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return undefined
  }
  return value
}

function normalizeExclusiveGroups(value: unknown): string[] {
  if (typeof value === 'string' && value.length > 0) {
    return [value]
  }
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
}

function createNodeTierDefaults(slotIds: SlotId[], tier: number): Record<number, number> {
  return Object.fromEntries(slotIds.map((slotId) => [slotId, tier]))
}
