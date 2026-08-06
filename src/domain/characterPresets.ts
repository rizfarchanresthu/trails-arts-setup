import azurePresets from '../database/character-preset/azure.json'
import coldSteelIPresets from '../database/character-preset/cold-steel-i.json'
import coldSteelIIPresets from '../database/character-preset/cold-steel-ii.json'
import coldSteelIIIPresets from '../database/character-preset/cold-steel-iii.json'
import coldSteelIVPresets from '../database/character-preset/cold-steel-iv.json'
import reveriePresets from '../database/character-preset/reverie.json'
import sky3rdPresets from '../database/character-preset/sky-3rd.json'
import skyFcPresets from '../database/character-preset/sky-fc.json'
import skyScPresets from '../database/character-preset/sky-sc.json'
import zeroPresets from '../database/character-preset/zero.json'
import { getBaseById } from './baseRegistry'
import { type LineDirection } from './rules/skyFcRules'
import { type ElementName, type OrbmentTopology, type SlotId } from './types'
import { type OrbmentPresetShape, type SlotElementRestrictionShape } from '../state/orbmentState'

type RawLineSlot = number | string

type RawRestrictionGroup = {
  slots: Array<number | string>
  element: ElementName
}

type RawCharacterPreset = {
  id: string
  name: string
  line_count: number
  lines: RawLineSlot[][]
  restriction: RawRestrictionGroup | RawRestrictionGroup[] | null
  route?: string
}

export type CharacterTemplate = {
  id: string
  name: string
  lineCount: number
  presetShape: OrbmentPresetShape
  restriction: SlotElementRestrictionShape
  route?: string
}

const PRESETS_BY_BASE: Record<string, RawCharacterPreset[]> = {
  'sky-fc': skyFcPresets as RawCharacterPreset[],
  'sky-sc': skyScPresets as RawCharacterPreset[],
  'sky-3rd': sky3rdPresets as RawCharacterPreset[],
  zero: zeroPresets as RawCharacterPreset[],
  azure: azurePresets as RawCharacterPreset[],
  'cold-steel-i': coldSteelIPresets as RawCharacterPreset[],
  'cold-steel-ii': coldSteelIIPresets as RawCharacterPreset[],
  'cold-steel-iii': coldSteelIIIPresets as RawCharacterPreset[],
  'cold-steel-iv': coldSteelIVPresets as RawCharacterPreset[],
  reverie: reveriePresets as RawCharacterPreset[],
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
      restriction: resolvePresetRestrictions(raw.restriction, topology),
      ...(raw.route ? { route: raw.route } : {}),
    }
  })
}

function resolvePresetRestrictions(
  restriction: RawCharacterPreset['restriction'],
  topology: OrbmentTopology,
): SlotElementRestrictionShape {
  if (!restriction) {
    return null
  }

  const groups = Array.isArray(restriction) ? restriction : [restriction]
  return groups.map((group) => ({
    slots: group.slots.map((slot) => resolvePresetSlot(slot, topology)),
    element: group.element,
  }))
}

function resolvePresetSlot(slot: RawLineSlot, topology: OrbmentTopology): SlotId {
  if (slot === 'M' || slot === 'm') {
    return topology.masterQuartzSlot ?? topology.centerSlot
  }
  if (slot === 'S' || slot === 's' || slot === 'SM' || slot === 'sm') {
    return topology.subMasterQuartzSlot ?? topology.centerSlot
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
