import type { OrbmentState } from '../state/orbmentState'

export const ELEMENTS = [
  'Earth',
  'Water',
  'Fire',
  'Wind',
  'Time',
  'Space',
  'Mirage',
] as const

export type ElementName = (typeof ELEMENTS)[number]

export const ELEMENT_COLORS: Record<ElementName, string> = {
  Earth: '#8b6f47',
  Water: '#2f7ee6',
  Fire: '#df4d3f',
  Wind: '#3cae6f',
  Time: '#747180',
  Space: '#E6C257',
  Mirage: '#D6D3CE',
}

export const LOST_QUARTZ_COLOR = '#8a4ecf'

export const LINE_COLORS = [
  '#f2c14e',
  '#4d9de0',
  '#5abf90',
  '#f25f5c',
  '#9c89b8',
  '#f28482',
  '#84a59d',
  '#f6bd60',
] as const

export type QuartzRank = 'R' | 'SR'

export type OrbmentRuleSetId = 'sky-crossbell' | 'cold-steel-i' | 'cold-steel-ii' | 'cold-steel-iii'

export function isColdSteelRuleSet(ruleSet?: OrbmentRuleSetId): boolean {
  return ruleSet === 'cold-steel-i' || ruleSet === 'cold-steel-ii' || ruleSet === 'cold-steel-iii'
}

export type SlotId = number

export type LocalizedName = {
  en: string
  ja: string
}

export type ElementRequirement = {
  value: number
  element?: ElementName
  elements?: ElementName[]
}

export type Quartz = {
  id: number
  name: LocalizedName
  effect: string
  element: ElementName | ElementName[]
  tier?: number
  rank?: QuartzRank | null
  exclusive_groups: string[]
  line_exclusive_groups?: string[]
  arts_learnt?: number[]
  elemental_value: ElementRequirement[] | 'No value' | null
  synthesis_cost: ElementRequirement[] | 'Not synthesizable'
}

export type MasterQuartzEffect = {
  title: string
  detail: string
}

export type MasterQuartzLevel = {
  level: number
  elemental_value?: ElementRequirement[]
  arts_learnt?: number[]
  effects: MasterQuartzEffect[]
}

export type MasterQuartz = {
  id: number
  name: LocalizedName
  element: ElementName
  description: string
  levels: MasterQuartzLevel[]
}

export type Art = {
  id: number
  name: LocalizedName
  image_url: string | null
  element: ElementName | ElementName[]
  category: 'offensive' | 'support'
  elemental_value: ElementRequirement[]
  cost: string
  time: {
    cast: number
    delay: number
  }
  power: number | string | null
  target: string
  effect: string | null
  description: string
}

export type ElementTotals = Record<ElementName, number>

export type OrbmentLine = SlotId[]

export type OrbmentTopology = {
  slotIds: SlotId[]
  centerSlot: SlotId
  outerSlots: SlotId[]
  outerDirectionSequence: SlotId[]
  outerAdjacency: Record<number, SlotId[]>
  wrapsOuterRing: boolean
  maxLines: number
  nodeTierDefaults: Record<number, number>
  masterQuartzSlot?: SlotId
  subMasterQuartzSlot?: SlotId
}

export type OrbmentVisual = {
  title: string
  outerEdges: 'straight' | 'circular'
  nodeShape: 'circle' | 'rect'
}

export type BaseData = {
  id: string
  label: string
  quartz: Quartz[]
  arts: Art[]
  masterQuartz?: MasterQuartz[]
  topology: OrbmentTopology
  orbmentVisual?: OrbmentVisual
  ruleSet?: OrbmentRuleSetId
}

export function formatSlotLabel(slotId: SlotId, topology: OrbmentTopology): string {
  if (topology.masterQuartzSlot === slotId) {
    return 'M'
  }
  if (topology.subMasterQuartzSlot === slotId) {
    return 'S'
  }
  return String(slotId)
}

export function isLostQuartz(quartz: Quartz): quartz is Quartz & { element: ElementName[] } {
  return Array.isArray(quartz.element)
}

export function getArtElements(art: Pick<Art, 'element'>): ElementName[] {
  return Array.isArray(art.element) ? art.element : [art.element]
}

export function quartzFitsSlotRestriction(quartz: Quartz, restriction: ElementName | null | undefined): boolean {
  if (Array.isArray(quartz.element)) {
    return restriction != null && quartz.element.includes(restriction)
  }
  return restriction == null || quartz.element === restriction
}

export type SavedQuartzSetup = {
  id: string
  baseGame: string
  name: string
  created_at: string
  edited_at: string
  orbmentState: OrbmentState
}

export type SavedQuartzSetupStorage = {
  version: 1
  setups: SavedQuartzSetup[]
}

export const EXPORTED_SETUP_KIND = 'trails-arts-gallery-setup'
export const EXPORTED_SETUP_VERSION = 1

export type ExportedQuartzSetup = {
  kind: typeof EXPORTED_SETUP_KIND
  version: typeof EXPORTED_SETUP_VERSION
  baseGame: string
  templateId: string | null
  name: string
  exported_at: string
  orbmentState: OrbmentState
}
