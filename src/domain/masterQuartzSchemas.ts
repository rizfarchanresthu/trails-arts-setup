export type MasterQuartzLevelField = 'elemental_value' | 'arts_learnt' | 'effects'

export type MasterQuartzSchema = {
  maxLevels: number
  levelFields: MasterQuartzLevelField[]
}

export const MASTER_QUARTZ_SCHEMAS: Record<string, MasterQuartzSchema> = {
  azure: { maxLevels: 5, levelFields: ['elemental_value', 'effects'] },
}

export function getMasterQuartzSchema(baseId: string): MasterQuartzSchema | null {
  return MASTER_QUARTZ_SCHEMAS[baseId] ?? null
}
