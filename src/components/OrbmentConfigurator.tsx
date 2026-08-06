import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { type CharacterTemplate } from '../domain/characterPresets'
import { collectCumulativeArtsLearnt } from '../domain/rules/coldSteelIRules'
import { type LineDirection } from '../domain/rules/skyFcRules'
import {
  ELEMENTS,
  LINE_COLORS,
  formatSlotLabel,
  isColdSteelRuleSet,
  quartzFitsSlotRestriction,
  type Art,
  type ElementName,
  type ElementRequirement,
  type MasterQuartz,
  type MasterQuartzLevel,
  type OrbmentLine,
  type OrbmentRuleSetId,
  type OrbmentTopology,
  type OrbmentVisual,
  type Quartz,
  type SlotId,
} from '../domain/types'
import {
  type OrbmentState,
  getAllowedQuartzForSlot,
  getAvailableLineStarts,
  getMasterQuartzLevelData,
} from '../state/orbmentState'
import { AppSelect } from './AppSelect'
import { MasterQuartzPicker } from './MasterQuartzPicker'
import { OrbmentGraph } from './OrbmentGraph'
import { QuartzPicker } from './QuartzPicker'

type OrbmentConfiguratorProps = {
  state: OrbmentState
  lines: OrbmentLine[]
  lineWarnings: string[]
  quartzList: Quartz[]
  quartzById: Map<number, Quartz>
  masterQuartzList?: MasterQuartz[]
  masterQuartzById?: Map<number, MasterQuartz>
  onLineCountChange: (lineCount: number) => void
  onLineStartChange: (lineIndex: number, start: SlotId) => void
  onLineDirectionChange: (lineIndex: number, direction: LineDirection) => void
  onTransferArcLength: (lineIndex: number, direction: 1 | -1) => void
  onRestrictionChange: (slotId: SlotId, restriction: ElementName | null) => void
  onQuartzChange: (slotId: SlotId, quartzId: number | null) => void
  onNodeTierChange: (slotId: SlotId, tier: number) => void
  onMasterQuartzChange?: (masterQuartzId: number | null) => void
  onMasterQuartzLevelChange?: (level: number) => void
  onSubMasterQuartzChange?: (subMasterQuartzId: number | null) => void
  onSubMasterQuartzLevelChange?: (level: number) => void
  topology: OrbmentTopology
  selectedBaseId: string
  selectedTemplateId: string
  characterTemplates: CharacterTemplate[]
  onTemplateChange: (templateId: string) => void
  orbmentVisual?: OrbmentVisual
  ruleSet?: OrbmentRuleSetId
  artsById?: Map<number, Art>
}

export function OrbmentConfigurator({
  state,
  lines,
  lineWarnings,
  quartzList,
  quartzById,
  masterQuartzList = [],
  masterQuartzById = new Map(),
  onLineCountChange,
  onLineStartChange,
  onLineDirectionChange,
  onTransferArcLength,
  onRestrictionChange,
  onQuartzChange,
  onNodeTierChange,
  onMasterQuartzChange,
  onMasterQuartzLevelChange,
  onSubMasterQuartzChange,
  onSubMasterQuartzLevelChange,
  topology,
  selectedBaseId,
  selectedTemplateId,
  characterTemplates,
  onTemplateChange,
  orbmentVisual,
  ruleSet,
  artsById = new Map(),
}: OrbmentConfiguratorProps) {
  const quartzTiers = quartzList.map((quartz) => quartz.tier).filter((tier): tier is number => tier != null)
  const minTier = quartzTiers.length > 0 ? Math.min(...quartzTiers) : 1
  const maxTier = quartzTiers.length > 0 ? Math.max(...quartzTiers) : 1
  const showNodeTierControls =
    selectedBaseId !== 'sky-fc' && ruleSet !== 'cold-steel-i' && ruleSet !== 'cold-steel-iii'
  const showGrantedArts = isColdSteelRuleSet(ruleSet)
  const configTitle = orbmentVisual?.title ? `${orbmentVisual.title} Config` : 'Orbment Config'
  const equippedMasterQuartz = state.equippedMasterQuartzId
    ? masterQuartzById.get(state.equippedMasterQuartzId)
    : null
  const masterLevelData = getMasterQuartzLevelData(equippedMasterQuartz, state.masterQuartzLevel)
  const equippedSubMasterQuartz = state.equippedSubMasterQuartzId
    ? masterQuartzById.get(state.equippedSubMasterQuartzId)
    : null
  const subMasterLevelData = getMasterQuartzLevelData(equippedSubMasterQuartz, state.subMasterQuartzLevel)
  const centerSlotId = topology.masterQuartzSlot ?? topology.centerSlot
  const { lineColumns, unassignedSlotIds } = getLineColumnSlotIds(lines, topology)

  const renderSlotCard = (slotId: SlotId) => {
    if (topology.masterQuartzSlot === slotId) {
      return (
        <MasterSlotCard
          key={`slot-${slotId}`}
          title="Master"
          quartzLabel="Master quartz"
          equippedMasterQuartz={equippedMasterQuartz}
          masterLevelData={masterLevelData}
          masterQuartzList={masterQuartzList}
          masterQuartzLevel={state.masterQuartzLevel}
          equippedMasterQuartzId={state.equippedMasterQuartzId}
          onMasterQuartzChange={onMasterQuartzChange}
          onMasterQuartzLevelChange={onMasterQuartzLevelChange}
          showGrantedArts={showGrantedArts}
          artsById={artsById}
          excludeId={state.equippedSubMasterQuartzId}
        />
      )
    }

    if (topology.subMasterQuartzSlot === slotId) {
      return (
        <MasterSlotCard
          key={`slot-${slotId}`}
          title="Sub-Master"
          quartzLabel="Sub-master quartz"
          equippedMasterQuartz={equippedSubMasterQuartz}
          masterLevelData={subMasterLevelData}
          masterQuartzList={masterQuartzList}
          masterQuartzLevel={state.subMasterQuartzLevel}
          equippedMasterQuartzId={state.equippedSubMasterQuartzId}
          onMasterQuartzChange={onSubMasterQuartzChange}
          onMasterQuartzLevelChange={onSubMasterQuartzLevelChange}
          showGrantedArts={showGrantedArts}
          artsById={artsById}
          excludeId={state.equippedMasterQuartzId}
          firstEffectOnly
        />
      )
    }

    return (
      <RegularSlotCard
        key={`slot-${slotId}`}
        slotId={slotId}
        state={state}
        topology={topology}
        quartzList={quartzList}
        quartzById={quartzById}
        minTier={minTier}
        maxTier={maxTier}
        showNodeTierControls={showNodeTierControls}
        onRestrictionChange={onRestrictionChange}
        onQuartzChange={onQuartzChange}
        onNodeTierChange={onNodeTierChange}
        lines={lines}
        ruleSet={ruleSet}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{configTitle}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="configWithGraph">
          <div className="configColumn grid gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <Label className="grid min-w-40 gap-1.5 font-normal">
                Character preset
                <AppSelect
                  value={selectedTemplateId}
                  options={[
                    { value: '', label: 'Custom' },
                    ...characterTemplates.map((template) => ({
                      value: template.id,
                      label: template.name,
                    })),
                  ]}
                  onChange={onTemplateChange}
                />
              </Label>
              <Label className="grid min-w-24 gap-1.5 font-normal">
                Line count
                <AppSelect
                  value={String(state.lineCount)}
                  options={Array.from({ length: topology.maxLines }, (_, index) => index + 1).map((lineCountValue) => ({
                    value: String(lineCountValue),
                    label: String(lineCountValue),
                  }))}
                  onChange={(nextValue) => onLineCountChange(Number(nextValue))}
                />
              </Label>
            </div>

            <div className="grid gap-3">
              {state.arcLengths.map((length, index) => (
                <Card key={`arc-${index}`} size="sm">
                  <CardHeader>
                    <CardTitle>
                      Line {index + 1}: {length} outer slot(s)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="flex flex-wrap items-end gap-3">
                      <Label className="grid min-w-28 gap-1.5 font-normal">
                        Start
                        <AppSelect
                          value={String(state.lineStarts[index])}
                          options={getAvailableLineStarts(state, index, topology).map((start) => ({
                            value: String(start),
                            label: formatSlotLabel(start, topology),
                          }))}
                          onChange={(nextValue) => onLineStartChange(index, Number(nextValue) as SlotId)}
                        />
                      </Label>
                      <Label className="grid min-w-28 gap-1.5 font-normal">
                        Direction
                        <AppSelect
                          value={state.lineDirections[index]}
                          options={[
                            { value: 'cw', label: 'CW' },
                            { value: 'ccw', label: 'CCW' },
                          ]}
                          onChange={(nextValue) => onLineDirectionChange(index, nextValue as LineDirection)}
                        />
                      </Label>
                    </div>
                    {state.arcLengths.length > 1 ? (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => onTransferArcLength(index, 1)}>
                          Take from next
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => onTransferArcLength(index, -1)}>
                          Give to next
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>

            {lineWarnings.length > 0 ? (
              <div className="grid gap-2">
                {lineWarnings.map((warning, index) => (
                  <Alert key={`line-warning-${index}`} variant="destructive">
                    <AlertDescription>{warning}</AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : null}

            <div className="grid gap-2">
              <h3 className="text-sm font-medium">Derived Lines</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {lines.map((line, index) => (
                  <li key={`line-${index}`}>
                    Line {index + 1}: {line.map((slotId) => formatSlotLabel(slotId, topology)).join(' -> ')}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div className="grid gap-2">
              <h3 className="text-sm font-medium">Adjacency Rule</h3>
              <p className="text-sm text-muted-foreground">
                Outer links follow this base perimeter sequence:{' '}
                {topology.outerDirectionSequence.map((slotId) => formatSlotLabel(slotId, topology)).join(' -> ')}.
              </p>
            </div>

            <div className="grid gap-2">
              <h3 className="text-sm font-medium">Character Preset Source</h3>
              <p className="text-sm text-muted-foreground">
                {selectedBaseId === 'sky-fc'
                  ? 'Sky FC templates are loaded from the Sky FC character preset database.'
                  : selectedBaseId === 'sky-sc'
                    ? 'Sky SC templates are loaded from the Sky SC character preset database.'
                    : selectedBaseId === 'sky-3rd'
                      ? 'Sky 3rd templates are loaded from the Sky 3rd character preset database.'
                      : selectedBaseId === 'zero'
                        ? 'Zero templates are loaded from the Zero character preset database.'
                        : selectedBaseId === 'azure'
                          ? 'Azure templates are loaded from the Azure character preset database.'
                          : selectedBaseId === 'cold-steel-i'
                            ? 'Cold Steel I templates are loaded from the Cold Steel I character preset database.'
                            : selectedBaseId === 'cold-steel-ii'
                              ? 'Cold Steel II templates are loaded from the Cold Steel II character preset database.'
                              : selectedBaseId === 'cold-steel-iii'
                                ? 'Cold Steel III templates are loaded from the Cold Steel III character preset database.'
                                : 'No base-specific character presets are loaded for this base yet.'}
              </p>
            </div>
          </div>

          <div className="graphColumn">
            <OrbmentGraph
              lines={lines}
              slotRestrictions={state.slotRestrictions}
              equippedQuartz={state.equippedQuartz}
              quartzById={quartzById}
              topology={topology}
              nodeTiers={state.nodeTiers}
              orbmentVisual={orbmentVisual}
              equippedMasterQuartzId={state.equippedMasterQuartzId}
              masterQuartzLevel={state.masterQuartzLevel}
              equippedSubMasterQuartzId={state.equippedSubMasterQuartzId}
              subMasterQuartzLevel={state.subMasterQuartzLevel}
              masterQuartzById={masterQuartzById}
              showTier={showNodeTierControls}
            />
          </div>
        </div>

        <div className="slotsByLine">
          <div className="grid gap-3">
            {renderSlotCard(centerSlotId)}
            {topology.subMasterQuartzSlot !== undefined
              ? renderSlotCard(topology.subMasterQuartzSlot)
              : null}
          </div>
          <div className="slotsLineColumns">
            {lineColumns.map((column) => (
              <div className="slotsLineColumn" key={`line-column-${column.lineIndex}`}>
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className="size-3 shrink-0 rounded-sm border border-border"
                    style={{ backgroundColor: LINE_COLORS[column.lineIndex % LINE_COLORS.length] }}
                  />
                  Line {column.lineIndex + 1}
                </h3>
                {column.slotIds.map((slotId) => renderSlotCard(slotId))}
              </div>
            ))}
            {unassignedSlotIds.length > 0 ? (
              <div className="slotsLineColumn" key="line-column-unassigned">
                <h3 className="text-sm font-medium">Unassigned</h3>
                {unassignedSlotIds.map((slotId) => renderSlotCard(slotId))}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getLineColumnSlotIds(lines: OrbmentLine[], topology: OrbmentTopology) {
  const assigned = new Set<SlotId>()
  const lineColumns = lines.map((line, lineIndex) => {
    const slotIds = line.filter((slotId) => slotId !== topology.centerSlot)
    for (const slotId of slotIds) {
      assigned.add(slotId)
    }
    return { lineIndex, slotIds }
  })
  const unassignedSlotIds = topology.outerSlots.filter((slotId) => !assigned.has(slotId))
  return { lineColumns, unassignedSlotIds }
}

type MasterSlotCardProps = {
  title?: string
  quartzLabel?: string
  equippedMasterQuartz: MasterQuartz | null | undefined
  masterLevelData: MasterQuartzLevel | null
  masterQuartzList: MasterQuartz[]
  masterQuartzLevel: number
  equippedMasterQuartzId: number | null
  onMasterQuartzChange?: (masterQuartzId: number | null) => void
  onMasterQuartzLevelChange?: (level: number) => void
  showGrantedArts?: boolean
  artsById?: Map<number, Art>
  excludeId?: number | null
  firstEffectOnly?: boolean
}

function MasterSlotCard({
  title = 'Master',
  quartzLabel = 'Master quartz',
  equippedMasterQuartz,
  masterLevelData,
  masterQuartzList,
  masterQuartzLevel,
  equippedMasterQuartzId,
  onMasterQuartzChange,
  onMasterQuartzLevelChange,
  showGrantedArts = false,
  artsById = new Map(),
  excludeId = null,
  firstEffectOnly = false,
}: MasterSlotCardProps) {
  const displayedEffects = firstEffectOnly
    ? (masterLevelData?.effects.slice(0, 1) ?? [])
    : (masterLevelData?.effects ?? [])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Label className="grid gap-1.5 font-normal">
          {quartzLabel}
          <MasterQuartzPicker
            masterQuartzList={masterQuartzList}
            value={equippedMasterQuartzId}
            onChange={(masterQuartzId) => onMasterQuartzChange?.(masterQuartzId)}
            excludeId={excludeId}
          />
        </Label>
        {equippedMasterQuartz ? (
          <>
            <Label className="grid gap-1.5 font-normal">
              MQ level
              <AppSelect
                value={String(masterQuartzLevel)}
                options={equippedMasterQuartz.levels.map((entry) => ({
                  value: String(entry.level),
                  label: `Level ${entry.level}`,
                }))}
                onChange={(nextValue) => onMasterQuartzLevelChange?.(Number(nextValue))}
              />
            </Label>
            <p className="text-sm text-muted-foreground">{equippedMasterQuartz.description}</p>
            {masterLevelData ? (
              <>
                {showGrantedArts ? (
                  <p className="text-sm text-muted-foreground">
                    Arts learnt: {formatArtsLearnt(equippedMasterQuartz, masterQuartzLevel, artsById)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Elemental value: {formatElementRequirements(masterLevelData.elemental_value ?? [])}
                  </p>
                )}
                <ul className="grid list-disc gap-1 pl-5 text-sm">
                  {displayedEffects.map((effect, index) => (
                    <li key={`mq-effect-${index}`}>
                      <strong>{effect.title}</strong>
                      {effect.detail ? `: ${effect.detail}` : ''}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

type RegularSlotCardProps = {
  slotId: SlotId
  state: OrbmentState
  topology: OrbmentTopology
  quartzList: Quartz[]
  quartzById: Map<number, Quartz>
  minTier: number
  maxTier: number
  showNodeTierControls: boolean
  onRestrictionChange: (slotId: SlotId, restriction: ElementName | null) => void
  onQuartzChange: (slotId: SlotId, quartzId: number | null) => void
  onNodeTierChange: (slotId: SlotId, tier: number) => void
  lines: OrbmentLine[]
  ruleSet?: OrbmentRuleSetId
}

function RegularSlotCard({
  slotId,
  state,
  topology,
  quartzList,
  quartzById,
  minTier,
  maxTier,
  showNodeTierControls,
  onRestrictionChange,
  onQuartzChange,
  onNodeTierChange,
  lines,
  ruleSet,
}: RegularSlotCardProps) {
  const restriction = state.slotRestrictions[slotId]
  const restrictionOnlyQuartz = quartzList.filter((quartz) => quartzFitsSlotRestriction(quartz, restriction))
  const allowedQuartz = getAllowedQuartzForSlot(
    quartzList,
    slotId,
    state.slotRestrictions,
    state.equippedQuartz,
    quartzById,
    state.nodeTiers,
    { lines, ruleSet },
  )
  const filteredByExclusivity = restrictionOnlyQuartz.length - allowedQuartz.length

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Slot {formatSlotLabel(slotId, topology)}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {showNodeTierControls ? (
          <Label className="grid gap-1.5 font-normal">
            Node tier
            <AppSelect
              value={String(state.nodeTiers[slotId])}
              options={Array.from({ length: maxTier - minTier + 1 }, (_, index) => minTier + index).map(
                (tierValue) => ({
                  value: String(tierValue),
                  label: `Tier ${tierValue}`,
                }),
              )}
              onChange={(nextValue) => onNodeTierChange(slotId, Number(nextValue))}
            />
          </Label>
        ) : null}

        <Label className="grid gap-1.5 font-normal">
          Restriction
          <AppSelect
            value={state.slotRestrictions[slotId] ?? ''}
            options={[
              { value: '', label: 'None' },
              ...ELEMENTS.map((element) => ({
                value: element,
                label: element,
              })),
            ]}
            onChange={(nextValue) => onRestrictionChange(slotId, (nextValue as ElementName) || null)}
          />
        </Label>

        <Label className="grid gap-1.5 font-normal">
          Quartz
          <QuartzPicker
            quartzList={allowedQuartz}
            value={state.equippedQuartz[slotId]}
            onChange={(quartzId) => onQuartzChange(slotId, quartzId)}
          />
        </Label>
        {filteredByExclusivity > 0 ? (
          <Alert>
            <AlertDescription>Some quartz hidden by exclusive-group rules.</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}

function formatArtsLearnt(
  masterQuartz: MasterQuartz,
  level: number,
  artsById: Map<number, Art>,
): string {
  const names = collectCumulativeArtsLearnt(masterQuartz, level).map(
    (artId) => artsById.get(artId)?.name.en ?? `#${artId}`,
  )
  return names.length > 0 ? names.join(', ') : 'None'
}

function formatElementRequirements(requirements: ElementRequirement[]): string {
  if (requirements.length === 0) {
    return 'None'
  }

  return requirements
    .map((requirement) => {
      if (requirement.element) {
        return `${requirement.element} ${requirement.value}`
      }
      if (requirement.elements && requirement.elements.length > 0) {
        return `${requirement.elements.join('/')} ${requirement.value}`
      }
      return String(requirement.value)
    })
    .join(', ')
}
