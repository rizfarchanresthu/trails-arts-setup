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
  type OrbmentState,
  setEquippedQuartz,
  setLineDirection,
  setLineStart,
  setSlotRestriction,
  transferArcLength,
  updateLineCount,
} from './state/orbmentState'
import {
  createSavedQuartzSetup,
  deleteSavedQuartzSetup,
  getSavedQuartzSetupById,
  listSavedQuartzSetups,
  sanitizeForBase,
  updateSavedQuartzSetup,
} from './state/savedQuartzSetups'

function App() {
  const [selectedBaseId, setSelectedBaseId] = useState('sky-fc')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [orbmentState, setOrbmentState] = useState(createInitialOrbmentState)
  const [savedSetups, setSavedSetups] = useState(listSavedQuartzSetups)
  const [selectedSavedSetupId, setSelectedSavedSetupId] = useState('')
  const [setupName, setSetupName] = useState('My setup')
  const [setupNotice, setSetupNotice] = useState('')
  const [draftBeforeSavedLoad, setDraftBeforeSavedLoad] = useState<{
    baseId: string
    templateId: string
    setupName: string
    orbmentState: OrbmentState
  } | null>(null)

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

  function refreshSavedSetups(): void {
    setSavedSetups(listSavedQuartzSetups())
  }

  function saveAsSetup(): void {
    const requestedName = setupName.trim() || 'Untitled setup'
    const nextName = getUniqueSetupName(requestedName, savedSetups)
    const created = createSavedQuartzSetup({
      baseGame: selectedBaseId,
      name: nextName,
      orbmentState,
    })
    refreshSavedSetups()
    setSelectedSavedSetupId(created.id)
    setSetupName(created.name)
    setSetupNotice(`Saved "${created.name}" as a new setup.`)
  }

  function saveCurrentSetup(): void {
    if (!selectedSavedSetupId) {
      saveAsSetup()
      return
    }

    const nextName = setupName.trim() || 'Untitled setup'
    const updated = updateSavedQuartzSetup(selectedSavedSetupId, {
      baseGame: selectedBaseId,
      name: nextName,
      orbmentState,
    })

    if (!updated) {
      setSetupNotice('Selected setup no longer exists. Use Save As.')
      refreshSavedSetups()
      setSelectedSavedSetupId('')
      return
    }

    refreshSavedSetups()
    setSetupName(updated.name)
    setSetupNotice(`Updated "${updated.name}".`)
  }

  function loadSavedSetup(setupId: string): void {
    const setup = getSavedQuartzSetupById(setupId)
    if (!setup) {
      setSetupNotice('Could not find that saved setup.')
      refreshSavedSetups()
      setSelectedSavedSetupId('')
      return
    }

    const targetBase = BASES.find((baseOption) => baseOption.id === setup.baseGame)
    if (!targetBase) {
      setSetupNotice(`Saved setup base "${setup.baseGame}" is not available in this build.`)
      return
    }

    const validQuartzIds = new Set(targetBase.quartz.map((quartz) => quartz.id))
    const sanitizedSetup = sanitizeForBase(setup, validQuartzIds)

    setSelectedBaseId(sanitizedSetup.baseGame)
    setSelectedTemplateId('')
    setOrbmentState(sanitizedSetup.orbmentState)
    setSelectedSavedSetupId(sanitizedSetup.id)
    setSetupName(sanitizedSetup.name)
    setSetupNotice(`Loaded "${sanitizedSetup.name}" (${targetBase.label}).`)
  }

  function removeSavedSetup(): void {
    if (!selectedSavedSetupId) {
      setSetupNotice('Select a setup to delete.')
      return
    }
    deleteSavedQuartzSetup(selectedSavedSetupId)
    refreshSavedSetups()
    setSelectedSavedSetupId('')
    setDraftBeforeSavedLoad(null)
    setSetupNotice('Deleted saved setup.')
  }

  function onSavedSetupSelectionChange(setupId: string): void {
    if (!setupId) {
      setSelectedSavedSetupId('')
      if (draftBeforeSavedLoad) {
        setSelectedBaseId(draftBeforeSavedLoad.baseId)
        setSelectedTemplateId(draftBeforeSavedLoad.templateId)
        setOrbmentState(cloneOrbmentState(draftBeforeSavedLoad.orbmentState))
        setSetupName(draftBeforeSavedLoad.setupName)
        setSetupNotice('Exited saved setup and restored your previous unsaved setup.')
        setDraftBeforeSavedLoad(null)
        return
      }
      setSetupNotice('No saved setup selected.')
      return
    }

    if (!selectedSavedSetupId && !draftBeforeSavedLoad) {
      setDraftBeforeSavedLoad({
        baseId: selectedBaseId,
        templateId: selectedTemplateId,
        setupName,
        orbmentState: cloneOrbmentState(orbmentState),
      })
    }

    loadSavedSetup(setupId)
  }

  return (
    <main className="appShell">
      <header className="panel">
        <h1>Trails Series Orbment Arts Setup</h1>
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
                setSelectedSavedSetupId('')
                setDraftBeforeSavedLoad(null)
                setSetupNotice('')
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
                setSelectedSavedSetupId('')
                setDraftBeforeSavedLoad(null)
                setSetupNotice('')
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
          <div className="fieldRow rowRightControls">
            <label>
              Saved setup
              <select
                value={selectedSavedSetupId}
                onChange={(event) => {
                  onSavedSetupSelectionChange(event.target.value)
                }}
              >
                <option value="">Select saved setup</option>
                {savedSetups.map((setup) => {
                  const setupBase = getBaseById(setup.baseGame)
                  return (
                    <option key={setup.id} value={setup.id}>
                      {setup.name} ({setupBase.label})
                    </option>
                  )
                })}
              </select>
            </label>
            <label>
              Setup name
              <input value={setupName} onChange={(event) => setSetupName(event.target.value)} />
            </label>
            <div className="inlineActions">
            <button type="button" onClick={saveCurrentSetup}>
              Save
            </button>
            <button type="button" onClick={saveAsSetup}>
              Save As
            </button>
            <button type="button" onClick={removeSavedSetup} disabled={!selectedSavedSetupId}>
              Delete
            </button>
            </div>
          </div>
        </div>
        {setupNotice ? <p className="hintText">{setupNotice}</p> : null}
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

function getUniqueSetupName(requestedName: string, savedSetups: Array<{ id: string; name: string }>): string {
  const names = new Set(savedSetups.map((setup) => setup.name.toLocaleLowerCase()))
  if (!names.has(requestedName.toLocaleLowerCase())) {
    return requestedName
  }

  let suffix = 1
  while (true) {
    const candidate = `${requestedName} (${suffix})`
    if (!names.has(candidate.toLocaleLowerCase())) {
      return candidate
    }
    suffix += 1
  }
}

function cloneOrbmentState(state: OrbmentState): OrbmentState {
  return {
    ...state,
    arcLengths: [...state.arcLengths],
    lineStarts: [...state.lineStarts],
    lineDirections: [...state.lineDirections],
    slotRestrictions: { ...state.slotRestrictions },
    equippedQuartz: { ...state.equippedQuartz },
  }
}
