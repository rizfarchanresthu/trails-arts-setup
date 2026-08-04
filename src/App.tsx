import { useMemo, useState } from 'react'
import './App.css'
import { ArtsList } from './components/ArtsList'
import { OrbmentConfigurator } from './components/OrbmentConfigurator'
import { evaluateAvailableArts } from './domain/artsEvaluator'
import { BASES, getBaseById } from './domain/baseRegistry'
import { getCharacterTemplatesForBase } from './domain/characterPresets'
import { deriveLinesFromConfig } from './domain/rules/skyFcRules'
import { type ElementName, type SlotId } from './domain/types'
import {
  applyPresetRestrictions,
  createOrbmentStateFromPreset,
  createInitialOrbmentState,
  setEquippedQuartz,
  setLineDirection,
  setLineStart,
  setSlotRestriction,
  transferArcLength,
  updateLineCount,
} from './state/orbmentState'

function App() {
  const [selectedBaseId, setSelectedBaseId] = useState('sky-fc')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [orbmentState, setOrbmentState] = useState(createInitialOrbmentState)

  const base = useMemo(() => getBaseById(selectedBaseId), [selectedBaseId])

  const quartzById = useMemo(() => {
    return new Map(base.quartz.map((quartz) => [quartz.id, quartz]))
  }, [base.quartz])

  const characterTemplates = useMemo(() => {
    return getCharacterTemplatesForBase(selectedBaseId)
  }, [selectedBaseId])

  const derivedLines = useMemo(() => {
    return deriveLinesFromConfig({
      lineCount: orbmentState.lineCount,
      lineConfigs: orbmentState.arcLengths.map((length, index) => ({
        length,
        start: orbmentState.lineStarts[index],
        direction: orbmentState.lineDirections[index],
      })),
    })
  }, [orbmentState.arcLengths, orbmentState.lineCount, orbmentState.lineDirections, orbmentState.lineStarts])

  const evaluation = useMemo(() => {
    return evaluateAvailableArts(base.arts, derivedLines.lines, quartzById, orbmentState.equippedQuartz)
  }, [base.arts, derivedLines.lines, quartzById, orbmentState.equippedQuartz])

  return (
    <main className="appShell">
      <header className="panel">
        <h1>Orbment Arts Calculator</h1>
        <div className="fieldRow">
          <label>
            Base
            <select
              value={selectedBaseId}
              onChange={(event) => {
                const nextBaseId = event.target.value
                setSelectedBaseId(nextBaseId)
                setSelectedTemplateId('')
                setOrbmentState(createInitialOrbmentState())
              }}
            >
              {BASES.map((baseOption) => (
                <option key={baseOption.id} value={baseOption.id}>
                  {baseOption.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Character template
            <select
              value={selectedTemplateId}
              onChange={(event) => {
                const templateId = event.target.value
                setSelectedTemplateId(templateId)
                if (!templateId) {
                  setOrbmentState(createInitialOrbmentState())
                  return
                }

                const selectedTemplate = characterTemplates.find((template) => template.id === templateId)
                if (!selectedTemplate) {
                  return
                }

                const presetState = createOrbmentStateFromPreset(selectedTemplate.presetShape)
                const withRestrictions = applyPresetRestrictions(presetState, selectedTemplate.restriction)
                setOrbmentState(withRestrictions)
              }}
            >
              <option value="">Custom</option>
              {characterTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="topSection">
        <OrbmentConfigurator
          state={orbmentState}
          lines={derivedLines.lines}
          lineWarnings={derivedLines.warnings}
          quartzList={base.quartz}
          quartzById={quartzById}
          onLineCountChange={(lineCount) => setOrbmentState((prev) => updateLineCount(prev, lineCount))}
          onLineStartChange={(lineIndex, start) =>
            setOrbmentState((prev) => setLineStart(prev, lineIndex, start))
          }
          onLineDirectionChange={(lineIndex, direction) =>
            setOrbmentState((prev) => setLineDirection(prev, lineIndex, direction))
          }
          onTransferArcLength={(lineIndex, direction) =>
            setOrbmentState((prev) => transferArcLength(prev, lineIndex, direction))
          }
          onRestrictionChange={(slotId: SlotId, restriction: ElementName | null) =>
            setOrbmentState((prev) => setSlotRestriction(prev, slotId, restriction, quartzById))
          }
          onQuartzChange={(slotId: SlotId, quartzId: number | null) =>
            setOrbmentState((prev) => setEquippedQuartz(prev, slotId, quartzId, quartzById))
          }
        />
      </section>

      <section className="bottomSection">
        <ArtsList
          arts={evaluation.availableArts}
          lineTotals={evaluation.lineTotals}
          elementOrderSource={base.arts}
        />
      </section>
    </main>
  )
}

export default App
