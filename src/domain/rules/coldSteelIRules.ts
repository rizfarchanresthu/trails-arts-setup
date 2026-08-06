import type { MasterQuartzEvalContext } from '../artsEvaluator'
import {
  type Art,
  type ElementTotals,
  type MasterQuartz,
  type OrbmentLine,
  type Quartz,
  type SlotId,
} from '../types'

export function quartzFamilyName(quartz: Quartz): string {
  if (quartz.rank === 'R' || quartz.rank === 'SR') {
    const parenthesized = ` (${quartz.rank})`
    if (quartz.name.en.endsWith(parenthesized)) {
      return quartz.name.en.slice(0, -parenthesized.length)
    }
    const plain = ` ${quartz.rank}`
    if (quartz.name.en.endsWith(plain)) {
      return quartz.name.en.slice(0, -plain.length)
    }
  }
  return quartz.name.en
}

export function canEquipColdSteelIQuartz(
  quartz: Quartz,
  slotId: SlotId,
  equippedQuartz: Record<SlotId, number | null>,
  quartzById: Map<number, Quartz>,
  lines: OrbmentLine[],
): boolean {
  const familyName = quartzFamilyName(quartz)
  for (const [slotKey, equippedId] of Object.entries(equippedQuartz)) {
    const equippedSlotId = Number(slotKey) as SlotId
    if (!equippedId || equippedSlotId === slotId) {
      continue
    }
    const equipped = quartzById.get(equippedId)
    if (!equipped) {
      continue
    }
    if (quartzFamilyName(equipped) === familyName) {
      return false
    }
  }

  const lineGroups = quartz.line_exclusive_groups ?? []
  if (lineGroups.length === 0) {
    return true
  }

  const line = lines.find((entry) => entry.includes(slotId))
  if (!line) {
    return true
  }

  const usedLineGroups = new Set<string>()
  for (const lineSlotId of line) {
    if (lineSlotId === slotId) {
      continue
    }
    const equippedId = equippedQuartz[lineSlotId]
    if (!equippedId) {
      continue
    }
    const equipped = quartzById.get(equippedId)
    for (const group of equipped?.line_exclusive_groups ?? []) {
      usedLineGroups.add(group)
    }
  }

  return !lineGroups.some((group) => usedLineGroups.has(group))
}

export function collectCumulativeArtsLearnt(masterQuartz: MasterQuartz, level: number): number[] {
  const ids = new Set<number>()
  for (const entry of masterQuartz.levels) {
    if (entry.level > level) {
      continue
    }
    for (const artId of entry.arts_learnt ?? []) {
      ids.add(artId)
    }
  }
  return [...ids]
}

export function evaluateGrantedArts(
  arts: Art[],
  quartzById: Map<number, Quartz>,
  equippedBySlot: Record<SlotId, number | null>,
  masterQuartz?: MasterQuartzEvalContext,
): { lineTotals: ElementTotals[]; availableArts: Art[] } {
  const grantedIds = new Set<number>()

  for (const quartzId of Object.values(equippedBySlot)) {
    if (!quartzId) {
      continue
    }
    const quartz = quartzById.get(quartzId)
    for (const artId of quartz?.arts_learnt ?? []) {
      grantedIds.add(artId)
    }
  }

  if (masterQuartz?.equippedMasterQuartzId) {
    const equipped = masterQuartz.masterQuartzById.get(masterQuartz.equippedMasterQuartzId)
    if (equipped) {
      for (const artId of collectCumulativeArtsLearnt(equipped, masterQuartz.masterQuartzLevel)) {
        grantedIds.add(artId)
      }
    }
  }

  if (masterQuartz?.equippedSubMasterQuartzId) {
    const equipped = masterQuartz.masterQuartzById.get(masterQuartz.equippedSubMasterQuartzId)
    if (equipped) {
      for (const artId of collectCumulativeArtsLearnt(equipped, masterQuartz.subMasterQuartzLevel ?? 1)) {
        grantedIds.add(artId)
      }
    }
  }

  const artsById = new Map(arts.map((art) => [art.id, art]))
  const availableArts = [...grantedIds]
    .map((artId) => artsById.get(artId))
    .filter((art): art is Art => art !== undefined)
    .sort((left, right) => left.id - right.id)

  return {
    lineTotals: [] as ElementTotals[],
    availableArts,
  }
}
