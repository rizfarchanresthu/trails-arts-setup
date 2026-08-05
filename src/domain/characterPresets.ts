import azurePresets from '../database/character-preset/azure.json'
import sky3rdPresets from '../database/character-preset/sky-3rd.json'
import skyFcPresets from '../database/character-preset/sky-fc.json'
import skyScPresets from '../database/character-preset/sky-sc.json'
import zeroPresets from '../database/character-preset/zero.json'
import { getBaseById } from './baseRegistry'
import { type LineDirection } from './rules/skyFcRules'
import { type ElementName, type OrbmentTopology, type SlotId } from './types'
import { type OrbmentPresetShape } from '../state/orbmentState'

type RawLineSlot = number | string

type RawCharacterPreset = {
  id: string
  name: string
  line_count: number
  lines: RawLineSlot[][]
  restriction: {
    slots: Array<number | string>
    element: ElementName
  } | null
}

export type CharacterTemplate = {
  id: string
  name: string
  lineCount: number
  presetShape: OrbmentPresetShape
  restriction: {
    slots: SlotId[]
    element: ElementName
  } | null
}

const PRESETS_BY_BASE: Record<string, RawCharacterPreset[]> = {
  'sky-fc': skyFcPresets as RawCharacterPreset[],
  'sky-sc': skyScPresets as RawCharacterPreset[],
  'sky-3rd': sky3rdPresets as RawCharacterPreset[],
  zero: zeroPresets as RawCharacterPreset[],
  azure: azurePresets as RawCharacterPreset[],
}

export function getCharacterTemplatesForBase(baseId: string): CharacterTemplate[] {
  const presets = PRESETS_BY_BASE[baseId]
  if (!presets) {
    return []
  }

  const topology = getBaseById(baseId).topology
  return presets.map((raw) => {
    const presetShape: OrbmentPresetShape = {
      lineCount: raw.line_count,
      lines: raw.lines.map((line) => {
        const resolved = line.map((slot) => resolvePresetSlot(slot, topology))
        const outer = resolved.slice(1)
        return {
          start: outer[0] ?? 2,
          direction: inferLineDirection(outer, topology),
          length: outer.length,
        }
      }),
    }

    return {
      id: raw.id,
      name: raw.name,
      lineCount: raw.line_count,
      presetShape,
      restriction: raw.restriction
        ? {
            slots: raw.restriction.slots.map((slot) => resolvePresetSlot(slot, topology)),
            element: raw.restriction.element,
          }
        : null,
    }
  })
}

function resolvePresetSlot(slot: RawLineSlot, topology: OrbmentTopology): SlotId {
  if (slot === 'M' || slot === 'm') {
    return topology.masterQuartzSlot ?? topology.centerSlot
  }
  return Number(slot) as SlotId
}

function inferLineDirection(outerPath: SlotId[], topology: OrbmentTopology): LineDirection {
  if (outerPath.length < 2) {
    return 'cw'
  }

  const sequence = topology.outerDirectionSequence
  const firstIndex = sequence.indexOf(outerPath[0])
  const secondIndex = sequence.indexOf(outerPath[1])
  if (firstIndex < 0 || secondIndex < 0) {
    return 'cw'
  }

  if (topology.wrapsOuterRing) {
    const length = sequence.length
    if (secondIndex === (firstIndex + 1) % length) {
      return 'cw'
    }
    if (secondIndex === (firstIndex - 1 + length) % length) {
      return 'ccw'
    }
  }

  return secondIndex > firstIndex ? 'cw' : 'ccw'
}
