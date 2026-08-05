import {
  ELEMENTS,
  type ElementName,
  type OrbmentTopology,
  type OrbmentVisual,
  type Quartz,
  type SlotId,
} from '../domain/types'
import { type OrbmentLine } from '../domain/types'
import { type LineDirection } from '../domain/rules/skyFcRules'
import { type OrbmentState, getAllowedQuartzForSlot, getAvailableLineStarts } from '../state/orbmentState'
import { type CharacterTemplate } from '../domain/characterPresets'
import { AppSelect } from './AppSelect'
import { OrbmentGraph } from './OrbmentGraph'
import { QuartzPicker } from './QuartzPicker'

type OrbmentConfiguratorProps = {
  state: OrbmentState
  lines: OrbmentLine[]
  lineWarnings: string[]
  quartzList: Quartz[]
  quartzById: Map<number, Quartz>
  onLineCountChange: (lineCount: number) => void
  onLineStartChange: (lineIndex: number, start: SlotId) => void
  onLineDirectionChange: (lineIndex: number, direction: LineDirection) => void
  onTransferArcLength: (lineIndex: number, direction: 1 | -1) => void
  onRestrictionChange: (slotId: SlotId, restriction: ElementName | null) => void
  onQuartzChange: (slotId: SlotId, quartzId: number | null) => void
  onNodeTierChange: (slotId: SlotId, tier: number) => void
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
  onLineCountChange,
  onLineStartChange,
  onLineDirectionChange,
  onTransferArcLength,
  onRestrictionChange,
  onQuartzChange,
  onNodeTierChange,
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
                        label: String(start),
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
                  Line {index + 1}: {line.join(' -> ')}
                </li>
              ))}
            </ul>
          </div>

          <div className="linePreview">
            <h3>Adjacency Rule</h3>
            <p>Outer links follow this base perimeter sequence: {topology.outerDirectionSequence.join(' -> ')}.</p>
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
                      : 'No base-specific character presets are loaded for this base yet.'}
            </p>
          </div>

          <div className="slotsGrid">
            {topology.slotIds.map((slotId) => {
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
                <article className="slotCard" key={`slot-${slotId}`}>
                  <h4>Slot {slotId}</h4>
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
                      onChange={(nextValue) =>
                        onRestrictionChange(slotId, (nextValue as ElementName) || null)
                      }
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
            })}
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
          />
        </div>
      </div>
    </section>
  )
}
