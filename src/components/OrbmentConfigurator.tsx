import { ELEMENTS, type ElementName, type OrbmentTopology, type Quartz, type SlotId } from '../domain/types'
import { type OrbmentLine } from '../domain/types'
import { type LineDirection } from '../domain/rules/skyFcRules'
import { type OrbmentState, getAllowedQuartzForSlot, getAvailableLineStarts } from '../state/orbmentState'
import { type CharacterTemplate } from '../domain/characterPresets'
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
}: OrbmentConfiguratorProps) {
  const maxTier = Math.max(1, ...quartzList.map((quartz) => quartz.tier ?? 1))
  const showNodeTierControls = selectedBaseId !== 'sky-fc'
  return (
    <section className="panel">
      <h2>Orbment Config</h2>
      <div className="configWithGraph">
        <div className="configColumn">
          <div className="fieldRow">
            <label>
              Character preset
              <select value={selectedTemplateId} onChange={(event) => onTemplateChange(event.target.value)}>
                <option value="">Custom</option>
                {characterTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Line count
              <select
                value={state.lineCount}
                onChange={(event) => onLineCountChange(Number(event.target.value))}
              >
                {Array.from({ length: topology.maxLines }, (_, index) => index + 1).map((lineCountValue) => (
                  <option key={lineCountValue} value={lineCountValue}>
                    {lineCountValue}
                  </option>
                ))}
              </select>
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
                    <select
                      value={state.lineStarts[index]}
                      onChange={(event) => onLineStartChange(index, Number(event.target.value) as SlotId)}
                    >
                      {getAvailableLineStarts(state, index, topology).map((start) => (
                        <option key={`line-start-${index}-${start}`} value={start}>
                          {start}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Direction
                    <select
                      value={state.lineDirections[index]}
                      onChange={(event) =>
                        onLineDirectionChange(index, event.target.value as LineDirection)
                      }
                    >
                      <option value="cw">CW</option>
                      <option value="ccw">CCW</option>
                    </select>
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
                      <select
                        value={state.nodeTiers[slotId]}
                        onChange={(event) => onNodeTierChange(slotId, Number(event.target.value))}
                      >
                        {Array.from({ length: maxTier }, (_, index) => index + 1).map((tierValue) => (
                          <option key={`slot-tier-${slotId}-${tierValue}`} value={tierValue}>
                            Tier {tierValue}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label>
                    Restriction
                    <select
                      value={state.slotRestrictions[slotId] ?? ''}
                      onChange={(event) =>
                        onRestrictionChange(slotId, (event.target.value as ElementName) || null)
                      }
                    >
                      <option value="">None</option>
                      {ELEMENTS.map((element) => (
                        <option key={element} value={element}>
                          {element}
                        </option>
                      ))}
                    </select>
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
          />
        </div>
      </div>
    </section>
  )
}
