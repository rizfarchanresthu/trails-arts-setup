import artsSkyFc from '../database/arts/sky-fc.json'
import quartzSkyFc from '../database/quartz/sky-fc.json'
import { ELEMENTS, type Art, type BaseData, type ElementName, type ElementRequirement, type Quartz } from './types'

const SKY_FC_BASE: BaseData = {
  id: 'sky-fc',
  label: 'Sky FC',
  quartz: quartzSkyFc.map((entry) => normalizeQuartz(entry)),
  arts: artsSkyFc.map((entry) => normalizeArt(entry)),
}

export const BASES: BaseData[] = [SKY_FC_BASE]

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
    exclusive_group:
      typeof record.exclusive_group === 'string' && record.exclusive_group.length > 0
        ? record.exclusive_group
        : null,
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
