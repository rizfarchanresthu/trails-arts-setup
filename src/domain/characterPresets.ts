import skyFcPresets from '../database/character-preset/sky-fc.json'
import { OUTER_DIRECTION_SEQUENCE, type LineDirection } from './rules/skyFcRules'
import { type ElementName, type SlotId } from './types'
import { type OrbmentPresetShape } from '../state/orbmentState'

type RawCharacterPreset = {
  id: string
  name: string
  line_count: number
  lines: number[][]
  restriction: {
    slots: number[]
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

export function getCharacterTemplatesForBase(baseId: string): CharacterTemplate[] {
  if (baseId !== 'sky-fc') {
    return []
  }

  return (skyFcPresets as RawCharacterPreset[]).map((raw) => {
    const presetShape: OrbmentPresetShape = {
      lineCount: raw.line_count,
      lines: raw.lines.map((line) => {
        const outer = line.slice(1) as SlotId[]
        return {
          start: outer[0] ?? 2,
          direction: inferLineDirection(outer),
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
            slots: raw.restriction.slots.map((slot) => slot as SlotId),
            element: raw.restriction.element,
          }
        : null,
    }
  })
}

function inferLineDirection(outerPath: SlotId[]): LineDirection {
  if (outerPath.length < 2) {
    return 'cw'
  }

  const firstIndex = OUTER_DIRECTION_SEQUENCE.indexOf(outerPath[0])
  const secondIndex = OUTER_DIRECTION_SEQUENCE.indexOf(outerPath[1])
  if (firstIndex < 0 || secondIndex < 0) {
    return 'cw'
  }

  return secondIndex > firstIndex ? 'cw' : 'ccw'
}
