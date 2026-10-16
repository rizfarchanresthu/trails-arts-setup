import { isXiphaSlotActive } from '../state/xiphaState'
import { type OrbmentState } from '../state/orbmentState'
import { isArtSatisfied } from './artsEvaluator'
import { applyElementRequirement, createEmptyTotals } from './rules/skyFcRules'
import {
  XIPHA_LINE_TYPES,
  getXiphaLineSlotIds,
  type ElementRequirement,
  type ElementTotals,
  type Quartz,
  type ShardSkill,
  type SlotId,
  type XiphaLineType,
} from './types'

export type XiphaLineTotals = Record<XiphaLineType, ElementTotals>

export type XiphaEvaluation = {
  lineTotals: XiphaLineTotals
  activeShardSkills: ShardSkill[]
}

export function evaluateXipha(
  shardSkills: ShardSkill[],
  state: OrbmentState,
  quartzById: Map<number, Quartz>,
): XiphaEvaluation {
  const lineTotals = calculateXiphaLineTotals(state, quartzById)
  return { lineTotals, activeShardSkills: evaluateShardSkills(shardSkills, lineTotals) }
}

export function calculateXiphaLineTotals(state: OrbmentState, quartzById: Map<number, Quartz>): XiphaLineTotals {
  const totals = {} as XiphaLineTotals
  for (const lineType of XIPHA_LINE_TYPES) {
    const lineTotals = createEmptyTotals()
    for (const slotId of getXiphaLineSlotIds(lineType)) {
      for (const requirement of getSlotElementalValue(state, slotId, quartzById)) {
        applyElementRequirement(lineTotals, requirement)
      }
    }
    totals[lineType] = lineTotals
  }
  return totals
}

/** Placeholder rule until the real Shard Skill rules are specified: a skill activates when its own line meets every requirement. */
export function evaluateShardSkills(shardSkills: ShardSkill[], lineTotals: XiphaLineTotals): ShardSkill[] {
  return shardSkills.filter((skill) => isArtSatisfied(skill, lineTotals[skill.line_type]))
}

function getSlotElementalValue(
  state: OrbmentState,
  slotId: SlotId,
  quartzById: Map<number, Quartz>,
): ElementRequirement[] {
  if (!state.xipha || !isXiphaSlotActive(state.xipha, slotId)) {
    return []
  }
  const quartzId = state.equippedQuartz[slotId]
  const quartz = quartzId ? quartzById.get(quartzId) : null
  if (!quartz || !Array.isArray(quartz.elemental_value)) {
    return []
  }
  if (!state.slotRestrictions[slotId]) {
    return quartz.elemental_value
  }
  return quartz.elemental_value.map((requirement) => ({ ...requirement, value: requirement.value * 2 }))
}
