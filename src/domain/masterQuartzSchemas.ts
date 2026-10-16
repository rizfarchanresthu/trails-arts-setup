export type MasterQuartzLevelField = 'elemental_value' | 'arts_learnt' | 'effects'

export type MasterQuartzSchema = {
  maxLevels: number
  levelFields: MasterQuartzLevelField[]
}

export const MASTER_QUARTZ_SCHEMAS: Record<string, MasterQuartzSchema> = {
  azure: { maxLevels: 5, levelFields: ['elemental_value', 'effects'] },
  'cold-steel-i': { maxLevels: 5, levelFields: ['arts_learnt', 'effects'] },
  'cold-steel-ii': { maxLevels: 5, levelFields: ['arts_learnt', 'effects'] },
}

export function getMasterQuartzSchema(baseId: string): MasterQuartzSchema | null {
  return MASTER_QUARTZ_SCHEMAS[baseId] ?? null
}
