import {
  type Art,
  type ElementName,
  type ElementRequirement,
  type ElementTotals,
  type MasterQuartz,
  type OrbmentLine,
  type Quartz,
  type SlotId,
} from './types'
import { applyElementRequirement, createEmptyTotals } from './rules/skyFcRules'

export type MasterQuartzEvalContext = {
  slotId?: SlotId
  masterQuartzById: Map<number, MasterQuartz>
  equippedMasterQuartzId: number | null
  masterQuartzLevel: number
}

export function evaluateAvailableArts(
  arts: Art[],
  lines: OrbmentLine[],
  quartzById: Map<number, Quartz>,
  equippedBySlot: Record<SlotId, number | null>,
  masterQuartz?: MasterQuartzEvalContext,
): { lineTotals: ElementTotals[]; availableArts: Art[] } {
  const lineTotals = lines.map((line) => calculateLineTotals(line, quartzById, equippedBySlot, masterQuartz))
  const availableArts = arts.filter((art) => lineTotals.some((totals) => isArtSatisfied(art, totals)))
  return { lineTotals, availableArts }
}

export function calculateLineTotals(
  line: OrbmentLine,
  quartzById: Map<number, Quartz>,
  equippedBySlot: Record<SlotId, number | null>,
  masterQuartz?: MasterQuartzEvalContext,
): ElementTotals {
  const totals = createEmptyTotals()
  const seenSlots = new Set<SlotId>()

  for (const slotId of line) {
    if (seenSlots.has(slotId)) {
      continue
    }
    seenSlots.add(slotId)

    const masterValues = getMasterQuartzElementalValue(slotId, masterQuartz)
    if (masterValues) {
      for (const requirement of masterValues) {
        applyElementRequirement(totals, requirement)
      }
      continue
    }

    const quartzId = equippedBySlot[slotId]
    if (!quartzId) {
      continue
    }

    const quartz = quartzById.get(quartzId)
    if (!quartz || quartz.elemental_value === 'No value' || quartz.elemental_value == null) {
      continue
    }

    for (const requirement of quartz.elemental_value) {
      applyElementRequirement(totals, requirement)
    }
  }

  return totals
}

export function isArtSatisfied(art: Art, totals: ElementTotals): boolean {
  return art.elemental_value.every((requirement) => {
    if (requirement.element) {
      return totals[requirement.element] >= requirement.value
    }

    if (requirement.elements) {
      return sumElements(totals, requirement.elements) >= requirement.value
    }

    return false
  })
}

function getMasterQuartzElementalValue(
  slotId: SlotId,
  masterQuartz?: MasterQuartzEvalContext,
): ElementRequirement[] | null {
  if (!masterQuartz || masterQuartz.slotId !== slotId || !masterQuartz.equippedMasterQuartzId) {
    return null
  }

  const equipped = masterQuartz.masterQuartzById.get(masterQuartz.equippedMasterQuartzId)
  const levelData = equipped?.levels.find((entry) => entry.level === masterQuartz.masterQuartzLevel)
  return levelData?.elemental_value ?? null
}

function sumElements(totals: ElementTotals, elements: ElementName[]): number {
  return elements.reduce((sum, element) => sum + totals[element], 0)
}
