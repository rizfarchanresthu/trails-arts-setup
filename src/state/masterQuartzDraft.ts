import type { MasterQuartzSchema } from '../domain/masterQuartzSchemas'
import type { ElementName, MasterQuartz, MasterQuartzLevel } from '../domain/types'

export type ElementalValueDraft = {
  element: ElementName
  value: string
}

export type EffectDraft = {
  title: string
  detail: string
}

export type MasterQuartzLevelDraft = {
  elementalValues: ElementalValueDraft[]
  effects: EffectDraft[]
}

export type MasterQuartzDraft = {
  nameEn: string
  nameJa: string
  element: ElementName
  imageUrl: string
  description: string
  levels: MasterQuartzLevelDraft[]
}

export function createEmptyLevelDraft(element: ElementName = 'Earth'): MasterQuartzLevelDraft {
  return {
    elementalValues: [{ element, value: '' }],
    effects: [{ title: '', detail: '' }],
  }
}

export function createEmptyMasterQuartzDraft(): MasterQuartzDraft {
  return {
    nameEn: '',
    nameJa: '',
    element: 'Earth',
    imageUrl: '',
    description: '',
    levels: [createEmptyLevelDraft()],
  }
}

export function draftFromMasterQuartz(masterQuartz: MasterQuartz): MasterQuartzDraft {
  return {
    nameEn: masterQuartz.name.en,
    nameJa: masterQuartz.name.ja,
    element: masterQuartz.element,
    imageUrl: masterQuartz.image_url ?? '',
    description: masterQuartz.description,
    levels: masterQuartz.levels.map((level) => ({
      elementalValues: (level.elemental_value ?? [])
        .filter((requirement) => requirement.element)
        .map((requirement) => ({
          element: requirement.element as ElementName,
          value: String(requirement.value),
        })),
      effects: level.effects.map((effect) => ({ ...effect })),
    })),
  }
}

export function masterQuartzFromDraft(draft: MasterQuartzDraft, id: number, schema: MasterQuartzSchema): MasterQuartz {
  return {
    id,
    name: { en: draft.nameEn, ja: draft.nameJa },
    element: draft.element,
    image_url: draft.imageUrl,
    description: draft.description,
    levels: draft.levels.map((level, index) => {
      const output: MasterQuartzLevel = {
        level: index + 1,
        effects: schema.levelFields.includes('effects') ? level.effects : [],
      }
      if (schema.levelFields.includes('elemental_value')) {
        output.elemental_value = level.elementalValues.map((requirement) => ({
          element: requirement.element,
          value: requirement.value.trim() === '' ? Number.NaN : Number(requirement.value),
        }))
      }
      return output
    }),
  }
}
