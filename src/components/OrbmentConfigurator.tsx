import { ELEMENTS, type ElementName, type Quartz, type SlotId } from '../domain/types'
import { type OrbmentLine } from '../domain/types'
import { type LineDirection } from '../domain/rules/skyFcRules'
import { type OrbmentState, getAllowedQuartzForSlot, getAvailableLineStarts } from '../state/orbmentState'
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
}: OrbmentConfiguratorProps) {
  return (
    <section className="panel">
      <h2>Orbment Config</h2>
      <div className="configWithGraph">
        <div className="configColumn">
          <div className="fieldRow">
            <label>
              Line count
              <select
                value={state.lineCount}
                onChange={(event) => onLineCountChange(Number(event.target.value))}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
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
                      {getAvailableLineStarts(state, index).map((start) => (
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
            <p>Outer links: 2-3, 3-4, 4-5, 5-6. Gap between 6 and 2.</p>
          </div>

          <div className="slotsGrid">
            {[1, 2, 3, 4, 5, 6].map((slotValue) => {
              const slotId = slotValue as SlotId
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
              )
              const filteredByExclusivity = restrictionOnlyQuartz.length - allowedQuartz.length

              return (
                <article className="slotCard" key={`slot-${slotId}`}>
                  <h4>Slot {slotId}</h4>
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
          />
        </div>
      </div>
    </section>
  )
}
