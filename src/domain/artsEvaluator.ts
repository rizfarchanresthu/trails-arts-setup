import { type Art, type ElementName, type ElementTotals, type OrbmentLine, type Quartz, type SlotId } from './types'
import { applyElementRequirement, createEmptyTotals } from './rules/skyFcRules'

export function evaluateAvailableArts(
  arts: Art[],
  lines: OrbmentLine[],
  quartzById: Map<number, Quartz>,
  equippedBySlot: Record<SlotId, number | null>,
): { lineTotals: ElementTotals[]; availableArts: Art[] } {
  const lineTotals = lines.map((line) => calculateLineTotals(line, quartzById, equippedBySlot))
  const availableArts = arts.filter((art) => lineTotals.some((totals) => isArtSatisfied(art, totals)))
  return { lineTotals, availableArts }
}

export function calculateLineTotals(
  line: OrbmentLine,
  quartzById: Map<number, Quartz>,
  equippedBySlot: Record<SlotId, number | null>,
): ElementTotals {
  const totals = createEmptyTotals()
  const seenSlots = new Set<SlotId>()

  for (const slotId of line) {
    if (seenSlots.has(slotId)) {
      continue
    }
    seenSlots.add(slotId)

    const quartzId = equippedBySlot[slotId]
    if (!quartzId) {
      continue
    }

    const quartz = quartzById.get(quartzId)
    if (!quartz || quartz.elemental_value === 'No value') {
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

function sumElements(totals: ElementTotals, elements: ElementName[]): number {
  return elements.reduce((sum, element) => sum + totals[element], 0)
}
