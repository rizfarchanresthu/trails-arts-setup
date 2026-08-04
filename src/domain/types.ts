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

export type SlotId = 1 | 2 | 3 | 4 | 5 | 6

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
  exclusive_group: string | null
  elemental_value: ElementRequirement[] | 'No value'
  synthesis_cost: ElementRequirement[] | 'Not synthesizable'
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
  power: number | null
  target: string
  effect: string | null
  description: string
}

export type ElementTotals = Record<ElementName, number>

export type OrbmentLine = SlotId[]

export type BaseData = {
  id: string
  label: string
  quartz: Quartz[]
  arts: Art[]
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
