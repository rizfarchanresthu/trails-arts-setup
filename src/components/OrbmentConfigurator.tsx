import {
  ELEMENTS,
  LINE_COLORS,
  formatSlotLabel,
  type ElementName,
  type ElementRequirement,
  type MasterQuartz,
  type MasterQuartzLevel,
  type OrbmentLine,
  type OrbmentTopology,
  type OrbmentVisual,
  type Quartz,
  type SlotId,
} from '../domain/types'
import { type LineDirection } from '../domain/rules/skyFcRules'
import {
  type OrbmentState,
  getAllowedQuartzForSlot,
  getAvailableLineStarts,
  getMasterQuartzLevelData,
} from '../state/orbmentState'
import { type CharacterTemplate } from '../domain/characterPresets'
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
  topology: OrbmentTopology
  selectedBaseId: string
  selectedTemplateId: string
  characterTemplates: CharacterTemplate[]
  onTemplateChange: (templateId: string) => void
  orbmentVisual?: OrbmentVisual
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
  topology,
  selectedBaseId,
  selectedTemplateId,
  characterTemplates,
  onTemplateChange,
  orbmentVisual,
}: OrbmentConfiguratorProps) {
  const maxTier = Math.max(1, ...quartzList.map((quartz) => quartz.tier ?? 1))
  const showNodeTierControls = selectedBaseId !== 'sky-fc'
  const configTitle = orbmentVisual?.title ? `${orbmentVisual.title} Config` : 'Orbment Config'
  const equippedMasterQuartz = state.equippedMasterQuartzId
    ? masterQuartzById.get(state.equippedMasterQuartzId)
    : null
  const masterLevelData = getMasterQuartzLevelData(equippedMasterQuartz, state.masterQuartzLevel)
  const centerSlotId = topology.masterQuartzSlot ?? topology.centerSlot
  const { lineColumns, unassignedSlotIds } = getLineColumnSlotIds(lines, topology)

  const renderSlotCard = (slotId: SlotId) => {
    if (topology.masterQuartzSlot === slotId) {
      return (
        <MasterSlotCard
          key={`slot-${slotId}`}
          equippedMasterQuartz={equippedMasterQuartz}
          masterLevelData={masterLevelData}
          masterQuartzList={masterQuartzList}
          masterQuartzLevel={state.masterQuartzLevel}
          equippedMasterQuartzId={state.equippedMasterQuartzId}
          onMasterQuartzChange={onMasterQuartzChange}
          onMasterQuartzLevelChange={onMasterQuartzLevelChange}
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
        maxTier={maxTier}
        showNodeTierControls={showNodeTierControls}
        onRestrictionChange={onRestrictionChange}
        onQuartzChange={onQuartzChange}
        onNodeTierChange={onNodeTierChange}
      />
    )
  }

  return (
    <section className="panel">
      <h2>{configTitle}</h2>
      <div className="configWithGraph">
        <div className="configColumn">
          <div className="fieldRow">
            <label>
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
            </label>
            <label>
              Line count
              <AppSelect
                value={String(state.lineCount)}
                options={Array.from({ length: topology.maxLines }, (_, index) => index + 1).map((lineCountValue) => ({
                  value: String(lineCountValue),
                  label: String(lineCountValue),
                }))}
                onChange={(nextValue) => onLineCountChange(Number(nextValue))}
              />
            </label>
          </div>

          <div className="arcList">
            {state.arcLengths.map((length, index) => (
              <div className="arcCard" key={`arc-${index}`}>
                <p>
                  Line {index + 1}: {length} outer slot(s)
                </p>
                <div className="fieldRow">
                  <label>
                    Start
                    <AppSelect
                      value={String(state.lineStarts[index])}
                      options={getAvailableLineStarts(state, index, topology).map((start) => ({
                        value: String(start),
                        label: formatSlotLabel(start, topology),
                      }))}
                      onChange={(nextValue) => onLineStartChange(index, Number(nextValue) as SlotId)}
                    />
                  </label>
                  <label>
                    Direction
                    <AppSelect
                      value={state.lineDirections[index]}
                      options={[
                        { value: 'cw', label: 'CW' },
                        { value: 'ccw', label: 'CCW' },
                      ]}
                      onChange={(nextValue) => onLineDirectionChange(index, nextValue as LineDirection)}
                    />
                  </label>
                </div>
                {state.arcLengths.length > 1 ? (
                  <div className="inlineActions">
                    <button type="button" onClick={() => onTransferArcLength(index, 1)}>
                      Take from next
                    </button>
                    <button type="button" onClick={() => onTransferArcLength(index, -1)}>
                      Give to next
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {lineWarnings.length > 0 ? (
            <div className="linePreview">
              {lineWarnings.map((warning, index) => (
                <p className="hintText" key={`line-warning-${index}`}>
                  {warning}
                </p>
              ))}
            </div>
          ) : null}

          <div className="linePreview">
            <h3>Derived Lines</h3>
            <ul>
              {lines.map((line, index) => (
                <li key={`line-${index}`}>
                  Line {index + 1}: {line.map((slotId) => formatSlotLabel(slotId, topology)).join(' -> ')}
                </li>
              ))}
            </ul>
          </div>

          <div className="linePreview">
            <h3>Adjacency Rule</h3>
            <p>
              Outer links follow this base perimeter sequence:{' '}
              {topology.outerDirectionSequence.map((slotId) => formatSlotLabel(slotId, topology)).join(' -> ')}.
            </p>
          </div>

          <div className="linePreview">
            <h3>Character Preset Source</h3>
            <p>
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
                        : 'No base-specific character presets are loaded for this base yet.'}
            </p>
          </div>

          <div className="slotsByLine">
            <div className="slotsCenterRow">{renderSlotCard(centerSlotId)}</div>
            <div className="slotsLineColumns">
              {lineColumns.map((column) => (
                <div className="slotsLineColumn" key={`line-column-${column.lineIndex}`}>
                  <h3 className="slotsLineColumnTitle">
                    <span
                      className="slotsLineSwatch"
                      style={{ backgroundColor: LINE_COLORS[column.lineIndex % LINE_COLORS.length] }}
                    />
                    Line {column.lineIndex + 1}
                  </h3>
                  {column.slotIds.map((slotId) => renderSlotCard(slotId))}
                </div>
              ))}
              {unassignedSlotIds.length > 0 ? (
                <div className="slotsLineColumn" key="line-column-unassigned">
                  <h3 className="slotsLineColumnTitle">Unassigned</h3>
                  {unassignedSlotIds.map((slotId) => renderSlotCard(slotId))}
                </div>
              ) : null}
            </div>
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
            masterQuartzById={masterQuartzById}
          />
        </div>
      </div>
    </section>
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
  equippedMasterQuartz: MasterQuartz | null | undefined
  masterLevelData: MasterQuartzLevel | null
  masterQuartzList: MasterQuartz[]
  masterQuartzLevel: number
  equippedMasterQuartzId: number | null
  onMasterQuartzChange?: (masterQuartzId: number | null) => void
  onMasterQuartzLevelChange?: (level: number) => void
}

function MasterSlotCard({
  equippedMasterQuartz,
  masterLevelData,
  masterQuartzList,
  masterQuartzLevel,
  equippedMasterQuartzId,
  onMasterQuartzChange,
  onMasterQuartzLevelChange,
}: MasterSlotCardProps) {
  return (
    <article className="slotCard">
      <h4>Master</h4>
      <label>
        Master quartz
        <MasterQuartzPicker
          masterQuartzList={masterQuartzList}
          value={equippedMasterQuartzId}
          onChange={(masterQuartzId) => onMasterQuartzChange?.(masterQuartzId)}
        />
      </label>
      {equippedMasterQuartz ? (
        <>
          <label>
            MQ level
            <AppSelect
              value={String(masterQuartzLevel)}
              options={equippedMasterQuartz.levels.map((entry) => ({
                value: String(entry.level),
                label: `Level ${entry.level}`,
              }))}
              onChange={(nextValue) => onMasterQuartzLevelChange?.(Number(nextValue))}
            />
          </label>
          <p className="mqDescription">{equippedMasterQuartz.description}</p>
          {masterLevelData ? (
            <>
              <p className="mqElementalValue">
                Elemental value: {formatElementRequirements(masterLevelData.elemental_value)}
              </p>
              <ul className="mqEffects">
                {masterLevelData.effects.map((effect, index) => (
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
    </article>
  )
}

type RegularSlotCardProps = {
  slotId: SlotId
  state: OrbmentState
  topology: OrbmentTopology
  quartzList: Quartz[]
  quartzById: Map<number, Quartz>
  maxTier: number
  showNodeTierControls: boolean
  onRestrictionChange: (slotId: SlotId, restriction: ElementName | null) => void
  onQuartzChange: (slotId: SlotId, quartzId: number | null) => void
  onNodeTierChange: (slotId: SlotId, tier: number) => void
}

function RegularSlotCard({
  slotId,
  state,
  topology,
  quartzList,
  quartzById,
  maxTier,
  showNodeTierControls,
  onRestrictionChange,
  onQuartzChange,
  onNodeTierChange,
}: RegularSlotCardProps) {
  const restriction = state.slotRestrictions[slotId]
  const restrictionOnlyQuartz = restriction
    ? quartzList.filter((quartz) => quartz.element === restriction)
    : quartzList
  const allowedQuartz = getAllowedQuartzForSlot(
    quartzList,
    slotId,
    state.slotRestrictions,
    state.equippedQuartz,
    quartzById,
    state.nodeTiers,
  )
  const filteredByExclusivity = restrictionOnlyQuartz.length - allowedQuartz.length

  return (
    <article className="slotCard">
      <h4>Slot {formatSlotLabel(slotId, topology)}</h4>
      {showNodeTierControls ? (
        <label>
          Node tier
          <AppSelect
            value={String(state.nodeTiers[slotId])}
            options={Array.from({ length: maxTier }, (_, index) => index + 1).map((tierValue) => ({
              value: String(tierValue),
              label: `Tier ${tierValue}`,
            }))}
            onChange={(nextValue) => onNodeTierChange(slotId, Number(nextValue))}
          />
        </label>
      ) : null}

      <label>
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
      </label>

      <label>
        Quartz
        <QuartzPicker
          quartzList={allowedQuartz}
          value={state.equippedQuartz[slotId]}
          onChange={(quartzId) => onQuartzChange(slotId, quartzId)}
        />
      </label>
      {filteredByExclusivity > 0 ? (
        <p className="hintText">Some quartz hidden by exclusive-group rules.</p>
      ) : null}
    </article>
  )
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
