import artsAzure from '../database/arts/azure.json'
import artsColdSteelI from '../database/arts/cold-steel-i.json'
import artsColdSteelII from '../database/arts/cold-steel-ii.json'
import artsColdSteelIII from '../database/arts/cold-steel-iii.json'
import artsColdSteelIV from '../database/arts/cold-steel-iv.json'
import artsReverie from '../database/arts/reverie.json'
import artsSky3rd from '../database/arts/sky-3rd.json'
import artsSkyFc from '../database/arts/sky-fc.json'
import artsSkySc from '../database/arts/sky-sc.json'
import artsZero from '../database/arts/zero.json'
import masterQuartzAzure from '../database/master-quartz/azure.json'
import masterQuartzColdSteelI from '../database/master-quartz/cold-steel-i.json'
import masterQuartzColdSteelII from '../database/master-quartz/cold-steel-ii.json'
import masterQuartzColdSteelIII from '../database/master-quartz/cold-steel-iii.json'
import masterQuartzColdSteelIV from '../database/master-quartz/cold-steel-iv.json'
import masterQuartzReverie from '../database/master-quartz/reverie.json'
import quartzAzure from '../database/quartz/azure.json'
import quartzColdSteelI from '../database/quartz/cold-steel-i.json'
import quartzColdSteelII from '../database/quartz/cold-steel-ii.json'
import quartzColdSteelIII from '../database/quartz/cold-steel-iii.json'
import quartzColdSteelIV from '../database/quartz/cold-steel-iv.json'
import quartzReverie from '../database/quartz/reverie.json'
import quartzSky3rd from '../database/quartz/sky-3rd.json'
import quartzSkyFc from '../database/quartz/sky-fc.json'
import quartzSkySc from '../database/quartz/sky-sc.json'
import quartzZero from '../database/quartz/zero.json'
import {
  ELEMENTS,
  type Art,
  type BaseData,
  type ElementName,
  type ElementRequirement,
  type MasterQuartz,
  type MasterQuartzEffect,
  type MasterQuartzLevel,
  type Quartz,
  type QuartzRank,
  type SlotId,
} from './types'

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
  nodeTierDefaults: createNodeTierDefaults([1, 2, 3, 4, 5, 6, 7], 3),
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

const ZERO_TOPOLOGY: BaseData['topology'] = {
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
  nodeTierDefaults: createNodeTierDefaults([1, 2, 3, 4, 5, 6, 7], 2),
}

const ZERO_BASE: BaseData = {
  id: 'zero',
  label: 'Zero',
  quartz: quartzZero.map((entry) => normalizeQuartz(entry)),
  arts: artsZero.map((entry) => normalizeArt(entry)),
  topology: ZERO_TOPOLOGY,
  orbmentVisual: {
    title: 'ENIGMA',
    outerEdges: 'circular',
    nodeShape: 'rect',
  },
}

const AZURE_TOPOLOGY: BaseData['topology'] = {
  ...ZERO_TOPOLOGY,
  masterQuartzSlot: 1,
  nodeTierDefaults: createNodeTierDefaults([2, 3, 4, 5, 6, 7], 2),
}

const AZURE_BASE: BaseData = {
  id: 'azure',
  label: 'Azure',
  quartz: quartzAzure.map((entry) => normalizeQuartz(entry)),
  arts: artsAzure.map((entry) => normalizeArt(entry)),
  masterQuartz: masterQuartzAzure.map((entry) => normalizeMasterQuartz(entry)),
  topology: AZURE_TOPOLOGY,
  orbmentVisual: {
    title: 'ENIGMA II',
    outerEdges: 'circular',
    nodeShape: 'rect',
  },
}

const COLD_STEEL_I_TOPOLOGY: BaseData['topology'] = {
  slotIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  centerSlot: 1,
  outerSlots: [2, 3, 4, 5, 6, 7, 8, 9],
  outerDirectionSequence: [2, 3, 4, 5, 6, 7, 8, 9],
  outerAdjacency: {
    1: [2, 3, 4, 5, 6, 7, 8, 9],
    2: [1, 3, 9],
    3: [1, 2, 4],
    4: [1, 3, 5],
    5: [1, 4, 6],
    6: [1, 5, 7],
    7: [1, 6, 8],
    8: [1, 7, 9],
    9: [1, 8, 2],
  },
  wrapsOuterRing: true,
  maxLines: 8,
  masterQuartzSlot: 1,
  nodeTierDefaults: createNodeTierDefaults([2, 3, 4, 5, 6, 7, 8, 9], 99),
}

const COLD_STEEL_I_BASE: BaseData = {
  id: 'cold-steel-i',
  label: 'Cold Steel I',
  quartz: quartzColdSteelI.map((entry) => normalizeQuartz(entry)),
  arts: artsColdSteelI.map((entry) => normalizeArt(entry)),
  masterQuartz: masterQuartzColdSteelI.map((entry) => normalizeMasterQuartz(entry)),
  topology: COLD_STEEL_I_TOPOLOGY,
  orbmentVisual: {
    title: 'ARCUS',
    outerEdges: 'straight',
    nodeShape: 'circle',
  },
  ruleSet: 'cold-steel-i',
}

const COLD_STEEL_II_TOPOLOGY: BaseData['topology'] = {
  ...COLD_STEEL_I_TOPOLOGY,
  nodeTierDefaults: createNodeTierDefaults([2, 3, 4, 5, 6, 7, 8, 9], 2),
}

const COLD_STEEL_II_QUARTZ = quartzColdSteelII.map((entry) => normalizeQuartz(entry))

const COLD_STEEL_II_BASE: BaseData = {
  id: 'cold-steel-ii',
  label: 'Cold Steel II',
  quartz: COLD_STEEL_II_QUARTZ,
  arts: applyLostQuartzArtElements(COLD_STEEL_II_QUARTZ, artsColdSteelII.map((entry) => normalizeArt(entry))),
  masterQuartz: masterQuartzColdSteelII.map((entry) => normalizeMasterQuartz(entry)),
  topology: COLD_STEEL_II_TOPOLOGY,
  orbmentVisual: {
    title: 'ARCUS',
    outerEdges: 'straight',
    nodeShape: 'circle',
  },
  ruleSet: 'cold-steel-ii',
}

const COLD_STEEL_III_TOPOLOGY: BaseData['topology'] = {
  slotIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  centerSlot: 1,
  outerSlots: [2, 3, 4, 5, 6, 7, 8],
  outerDirectionSequence: [2, 3, 4, 5, 6, 7, 8],
  outerAdjacency: {
    1: [2, 3, 4, 5, 6, 7, 8, 9],
    2: [1, 3],
    3: [1, 2, 4],
    4: [1, 3, 5],
    5: [1, 4, 6],
    6: [1, 5, 7],
    7: [1, 6, 8],
    8: [1, 7],
    9: [1],
  },
  wrapsOuterRing: false,
  maxLines: 7,
  masterQuartzSlot: 1,
  subMasterQuartzSlot: 9,
  nodeTierDefaults: createNodeTierDefaults([2, 3, 4, 5, 6, 7, 8], 99),
}

const COLD_STEEL_III_BASE: BaseData = {
  id: 'cold-steel-iii',
  label: 'Cold Steel III',
  quartz: quartzColdSteelIII.map((entry) => normalizeQuartz(entry)),
  arts: artsColdSteelIII.map((entry) => normalizeArt(entry)),
  masterQuartz: masterQuartzColdSteelIII.map((entry) => normalizeMasterQuartz(entry)),
  topology: COLD_STEEL_III_TOPOLOGY,
  orbmentVisual: {
    title: 'ARCUS II',
    outerEdges: 'straight',
    nodeShape: 'circle',
  },
  ruleSet: 'cold-steel-iii',
}

const COLD_STEEL_IV_TOPOLOGY: BaseData['topology'] = {
  ...COLD_STEEL_III_TOPOLOGY,
  nodeTierDefaults: createNodeTierDefaults([2, 3, 4, 5, 6, 7, 8], 2),
}

const COLD_STEEL_IV_BASE: BaseData = {
  id: 'cold-steel-iv',
  label: 'Cold Steel IV',
  quartz: quartzColdSteelIV.map((entry) => normalizeQuartz(entry)),
  arts: artsColdSteelIV.map((entry) => normalizeArt(entry)),
  masterQuartz: masterQuartzColdSteelIV.map((entry) => normalizeMasterQuartz(entry)),
  topology: COLD_STEEL_IV_TOPOLOGY,
  orbmentVisual: {
    title: 'ARCUS II',
    outerEdges: 'straight',
    nodeShape: 'circle',
  },
  ruleSet: 'cold-steel-iv',
}

const REVERIE_BASE: BaseData = {
  id: 'reverie',
  label: 'Reverie',
  quartz: quartzReverie.map((entry) => normalizeQuartz(entry)),
  arts: artsReverie.map((entry) => normalizeArt(entry)),
  masterQuartz: masterQuartzReverie.map((entry) => normalizeMasterQuartz(entry)),
  topology: COLD_STEEL_IV_TOPOLOGY,
  orbmentVisual: {
    title: 'ARCUS II',
    outerEdges: 'straight',
    nodeShape: 'circle',
  },
  ruleSet: 'reverie',
}

export const BASES: BaseData[] = [
  SKY_FC_BASE,
  SKY_SC_BASE,
  SKY_3RD_BASE,
  ZERO_BASE,
  AZURE_BASE,
  COLD_STEEL_I_BASE,
  COLD_STEEL_II_BASE,
  COLD_STEEL_III_BASE,
  COLD_STEEL_IV_BASE,
  REVERIE_BASE,
]

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
    element: toQuartzElement(record.element),
    tier: normalizeTier(record.tier),
    rank: normalizeRank(record.rank),
    exclusive_groups: normalizeExclusiveGroups(record.exclusive_groups ?? record.exclusive_group),
    line_exclusive_groups: normalizeExclusiveGroups(record.line_exclusive_groups),
    arts_learnt: normalizeArtIds(record.arts_learnt),
    elemental_value: normalizeElementalValue(record.elemental_value),
    synthesis_cost: normalizeSynthesisCost(record.synthesis_cost),
  }
}

function normalizeMasterQuartz(input: unknown): MasterQuartz {
  const record = input as Record<string, unknown>
  return {
    id: Number(record.id),
    name: record.name as MasterQuartz['name'],
    element: toElementName(record.element),
    description: String(record.description),
    levels: normalizeMasterQuartzLevels(record.levels),
  }
}

function normalizeMasterQuartzLevels(input: unknown): MasterQuartzLevel[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((entry) => {
      const record = entry as Record<string, unknown>
      return {
        level: Number(record.level),
        elemental_value: normalizeRequirementArray(record.elemental_value),
        arts_learnt: normalizeArtIds(record.arts_learnt),
        effects: normalizeMasterQuartzEffects(record.effects),
      }
    })
    .filter((entry) => Number.isInteger(entry.level) && entry.level >= 1)
    .sort((left, right) => left.level - right.level)
}

function normalizeMasterQuartzEffects(input: unknown): MasterQuartzEffect[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input.map((entry) => {
    const record = entry as Record<string, unknown>
    return {
      title: String(record.title ?? ''),
      detail: String(record.detail ?? ''),
    }
  })
}

function normalizeArt(input: unknown): Art {
  const record = input as Record<string, unknown>
  return {
    id: Number(record.id),
    name: record.name as Art['name'],
    image_url: typeof record.image_url === 'string' ? record.image_url : null,
    element: toQuartzElement(record.element),
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

function normalizeElementalValue(input: unknown): ElementRequirement[] | 'No value' | null {
  if (input === 'No value') {
    return 'No value'
  }
  if (input == null) {
    return null
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

function applyLostQuartzArtElements(quartz: Quartz[], arts: Art[]): Art[] {
  const elementsByArtId = new Map<number, ElementName[]>()
  for (const entry of quartz) {
    if (!Array.isArray(entry.element)) {
      continue
    }
    for (const artId of entry.arts_learnt ?? []) {
      elementsByArtId.set(artId, entry.element)
    }
  }
  if (elementsByArtId.size === 0) {
    return arts
  }
  return arts.map((art) => {
    const elements = elementsByArtId.get(art.id)
    return elements ? { ...art, element: elements } : art
  })
}

function toQuartzElement(value: unknown): ElementName | ElementName[] {
  if (Array.isArray(value)) {
    const elements = value.map((entry) => toElementName(entry))
    if (elements.length === 0) {
      throw new Error('Unexpected empty element array')
    }
    return elements
  }
  return toElementName(value)
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
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
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

function normalizeRank(value: unknown): QuartzRank | null | undefined {
  if (value === 'R' || value === 'SR' || value === 'UR') {
    return value
  }
  if (value === null) {
    return null
  }
  return undefined
}

function normalizeArtIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((entry): entry is number => typeof entry === 'number' && Number.isInteger(entry) && entry >= 1)
}

function createNodeTierDefaults(slotIds: SlotId[], tier: number): Record<number, number> {
  return Object.fromEntries(slotIds.map((slotId) => [slotId, tier]))
}
