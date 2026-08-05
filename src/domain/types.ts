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

export const LINE_COLORS = ['#f25f5c', '#4d9de0', '#5abf90', '#f2c14e', '#9c89b8'] as const

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
  element: ElementName
  tier?: number
  exclusive_groups: string[]
  elemental_value: ElementRequirement[] | 'No value'
  synthesis_cost: ElementRequirement[] | 'Not synthesizable'
}

export type MasterQuartzEffect = {
  title: string
  detail: string
}

export type MasterQuartzLevel = {
  level: number
  elemental_value: ElementRequirement[]
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
  element: ElementName
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
}

export function formatSlotLabel(slotId: SlotId, topology: OrbmentTopology): string {
  return topology.masterQuartzSlot === slotId ? 'M' : String(slotId)
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
