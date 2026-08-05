import { useMemo, useRef, useState } from 'react'
import './App.css'
import { AppSelect } from './components/AppSelect'
import { ArtsList } from './components/ArtsList'
import { OrbmentConfigurator } from './components/OrbmentConfigurator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  setEquippedMasterQuartz,
  setEquippedQuartz,
  setLineDirection,
  setLineStart,
  setMasterQuartzLevel,
  setNodeTier,
  setSlotRestriction,
  transferArcLength,
  updateLineCount,
} from './state/orbmentState'
import {
  buildExportedSetup,
  createSavedQuartzSetup,
  deleteSavedQuartzSetup,
  getSavedQuartzSetupById,
  listSavedQuartzSetups,
  parseExportedSetup,
  sanitizeExportedSetup,
  sanitizeForBase,
  updateSavedQuartzSetup,
} from './state/savedQuartzSetups'

type MainTab = 'orbment' | 'arts'
type SetupNoticeTone = 'default' | 'success' | 'error'

function App() {
  const [selectedBaseId, setSelectedBaseId] = useState('sky-fc')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('orbment')
  const [orbmentState, setOrbmentState] = useState(() => createInitialOrbmentState(getBaseById('sky-fc').topology))
  const [savedSetups, setSavedSetups] = useState(listSavedQuartzSetups)
  const [selectedSavedSetupId, setSelectedSavedSetupId] = useState('')
  const [setupName, setSetupName] = useState('My setup')
  const [setupNotice, setSetupNoticeState] = useState('')
  const [setupNoticeTone, setSetupNoticeTone] = useState<SetupNoticeTone>('default')
  const [draftBeforeSavedLoad, setDraftBeforeSavedLoad] = useState<{
    baseId: string
    templateId: string
    setupName: string
    orbmentState: OrbmentState
  } | null>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)

  const base = useMemo(() => getBaseById(selectedBaseId), [selectedBaseId])

  const quartzById = useMemo(() => {
    return new Map(base.quartz.map((quartz) => [quartz.id, quartz]))
  }, [base.quartz])

  const masterQuartzById = useMemo(() => {
    return new Map((base.masterQuartz ?? []).map((masterQuartz) => [masterQuartz.id, masterQuartz]))
  }, [base.masterQuartz])

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
      topology: base.topology,
    })
  }, [base.topology, orbmentState.arcLengths, orbmentState.lineCount, orbmentState.lineDirections, orbmentState.lineStarts])

  const evaluation = useMemo(() => {
    return evaluateAvailableArts(base.arts, derivedLines.lines, quartzById, orbmentState.equippedQuartz, {
      slotId: base.topology.masterQuartzSlot,
      masterQuartzById,
      equippedMasterQuartzId: orbmentState.equippedMasterQuartzId,
      masterQuartzLevel: orbmentState.masterQuartzLevel,
    })
  }, [
    base.arts,
    base.topology.masterQuartzSlot,
    derivedLines.lines,
    masterQuartzById,
    orbmentState.equippedMasterQuartzId,
    orbmentState.equippedQuartz,
    orbmentState.masterQuartzLevel,
    quartzById,
  ])

  function refreshSavedSetups(): void {
    setSavedSetups(listSavedQuartzSetups())
  }

  function setSetupNotice(message: string, tone: SetupNoticeTone = 'default'): void {
    setSetupNoticeState(message)
    setSetupNoticeTone(message ? tone : 'default')
  }

  function saveAsSetup(): void {
    const requestedName = setupName.trim() || 'Untitled setup'
    const nextName = getUniqueSetupName(requestedName, savedSetups)
    const created = createSavedQuartzSetup({
      baseGame: selectedBaseId,
      name: nextName,
      orbmentState,
      topology: base.topology,
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
      topology: base.topology,
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
    const validMasterQuartzIds = new Set((targetBase.masterQuartz ?? []).map((masterQuartz) => masterQuartz.id))
    const sanitizedSetup = sanitizeForBase(setup, validQuartzIds, targetBase.topology, validMasterQuartzIds)

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

  function resetCurrentEditor(): void {
    setSelectedTemplateId('')
    setOrbmentState(createInitialOrbmentState(base.topology))
    setSelectedSavedSetupId('')
    setDraftBeforeSavedLoad(null)
    setSetupName('My setup')
    setSetupNotice(`Reset to default for ${base.label}.`)
  }

  function exportCurrentSetup(): void {
    const exported = buildExportedSetup({
      baseGame: selectedBaseId,
      templateId: selectedTemplateId || null,
      name: setupName.trim() || 'Untitled setup',
      orbmentState,
    })
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${toExportFileName(exported.name)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setSetupNotice(`Exported "${exported.name}".`)
  }

  async function importSetupFromFile(file: File): Promise<void> {
    let text: string
    try {
      text = await file.text()
    } catch {
      setSetupNotice('Could not read the selected file.', 'error')
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      setSetupNotice('Import file is not valid JSON.', 'error')
      return
    }

    const exported = parseExportedSetup(parsed)
    if (!exported) {
      setSetupNotice('Import file is not a valid setup export.', 'error')
      return
    }

    const targetBase = BASES.find((baseOption) => baseOption.id === exported.baseGame)
    if (!targetBase) {
      setSetupNotice(`Imported setup base "${exported.baseGame}" is not available in this build.`, 'error')
      return
    }

    const validQuartzIds = new Set(targetBase.quartz.map((quartz) => quartz.id))
    const validMasterQuartzIds = new Set((targetBase.masterQuartz ?? []).map((masterQuartz) => masterQuartz.id))
    const sanitized = sanitizeExportedSetup(exported, validQuartzIds, targetBase.topology, validMasterQuartzIds)
    const templatesForBase = getCharacterTemplatesForBase(targetBase.id)
    const restoredTemplateId =
      sanitized.templateId && templatesForBase.some((template) => template.id === sanitized.templateId)
        ? sanitized.templateId
        : ''
    const templateLabel = restoredTemplateId
      ? (templatesForBase.find((template) => template.id === restoredTemplateId)?.name ?? restoredTemplateId)
      : 'Custom'

    setSelectedBaseId(targetBase.id)
    setSelectedTemplateId(restoredTemplateId)
    setOrbmentState(sanitized.orbmentState)
    setSelectedSavedSetupId('')
    setDraftBeforeSavedLoad(null)
    setSetupName(sanitized.name)
    setSetupNotice(`Imported "${sanitized.name}" (${targetBase.label}, ${templateLabel}).`, 'success')
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
    <main className="mx-auto grid min-h-screen max-w-[1200px] gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Trails Series Quartz Setup</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Label className="grid min-w-40 gap-1.5 font-normal">
              Base
              <AppSelect
                value={selectedBaseId}
                options={BASES.map((baseOption) => ({
                  value: baseOption.id,
                  label: baseOption.label,
                }))}
                onChange={(nextBaseId) => {
                  if (!nextBaseId) {
                    return
                  }
                  setSelectedBaseId(nextBaseId)
                  setSelectedTemplateId('')
                  setOrbmentState(createInitialOrbmentState(getBaseById(nextBaseId).topology))
                  setSelectedSavedSetupId('')
                  setDraftBeforeSavedLoad(null)
                  setSetupNotice('')
                }}
              />
            </Label>
            <Button type="button" variant="outline" onClick={resetCurrentEditor}>
              Reset
            </Button>
            <div className="ml-auto flex flex-wrap items-end gap-3">
              <Label className="grid min-w-40 gap-1.5 font-normal">
                Saved setup
                <AppSelect
                  value={selectedSavedSetupId}
                  options={[
                    { value: '', label: 'Select saved setup' },
                    ...savedSetups.map((setup) => {
                      const setupBase = getBaseById(setup.baseGame)
                      return {
                        value: setup.id,
                        label: `${setup.name} (${setupBase.label})`,
                      }
                    }),
                  ]}
                  onChange={onSavedSetupSelectionChange}
                />
              </Label>
              <Label className="grid min-w-40 gap-1.5 font-normal">
                Setup name
                <Input value={setupName} onChange={(event) => setSetupName(event.target.value)} />
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={saveCurrentSetup}>
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={saveAsSetup}>
                  Save As
                </Button>
                <Button type="button" variant="destructive" onClick={removeSavedSetup} disabled={!selectedSavedSetupId}>
                  Delete
                </Button>
                <Button type="button" variant="outline" onClick={exportCurrentSetup}>
                  Export
                </Button>
                <Button type="button" variant="outline" onClick={() => importFileInputRef.current?.click()}>
                  Import
                </Button>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (!file) {
                      return
                    }
                    void importSetupFromFile(file)
                  }}
                />
              </div>
            </div>
          </div>
          {setupNotice ? (
            <Alert
              variant={
                setupNoticeTone === 'error' ? 'destructive' : setupNoticeTone === 'success' ? 'success' : 'default'
              }
            >
              <AlertDescription>{setupNotice}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Tabs
        className="min-w-0 gap-4"
        value={activeMainTab}
        onValueChange={(value) => {
          if (value === 'orbment' || value === 'arts') {
            setActiveMainTab(value)
          }
        }}
      >
        <TabsList className="h-auto gap-2 p-1">
          <TabsTrigger className="px-3 py-1.5" value="orbment">
            Orbment
          </TabsTrigger>
          <TabsTrigger className="px-3 py-1.5" value="arts">
            Available Arts ({evaluation.availableArts.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent className="text-base outline-none" value="orbment">
          <OrbmentConfigurator
            state={orbmentState}
            lines={derivedLines.lines}
            lineWarnings={derivedLines.warnings}
            quartzList={base.quartz}
            quartzById={quartzById}
            masterQuartzList={base.masterQuartz ?? []}
            masterQuartzById={masterQuartzById}
            onLineCountChange={(lineCount) =>
              setOrbmentState((prev) => updateLineCount(prev, lineCount, base.topology))
            }
            onLineStartChange={(lineIndex, start) =>
              setOrbmentState((prev) => setLineStart(prev, lineIndex, start, base.topology))
            }
            onLineDirectionChange={(lineIndex, direction) =>
              setOrbmentState((prev) => setLineDirection(prev, lineIndex, direction))
            }
            onTransferArcLength={(lineIndex, direction) =>
              setOrbmentState((prev) => transferArcLength(prev, lineIndex, direction))
            }
            onRestrictionChange={(slotId: SlotId, restriction: ElementName | null) =>
              setOrbmentState((prev) =>
                setSlotRestriction(prev, slotId, restriction, quartzById, base.topology.masterQuartzSlot),
              )
            }
            onQuartzChange={(slotId: SlotId, quartzId: number | null) =>
              setOrbmentState((prev) =>
                setEquippedQuartz(prev, slotId, quartzId, quartzById, base.topology.masterQuartzSlot),
              )
            }
            onNodeTierChange={(slotId: SlotId, tier: number) =>
              setOrbmentState((prev) => setNodeTier(prev, slotId, tier, quartzById, base.topology.masterQuartzSlot))
            }
            onMasterQuartzChange={(masterQuartzId) =>
              setOrbmentState((prev) => setEquippedMasterQuartz(prev, masterQuartzId, masterQuartzById))
            }
            onMasterQuartzLevelChange={(level) =>
              setOrbmentState((prev) => setMasterQuartzLevel(prev, level, masterQuartzById))
            }
            topology={base.topology}
            orbmentVisual={base.orbmentVisual}
            selectedBaseId={selectedBaseId}
            selectedTemplateId={selectedTemplateId}
            characterTemplates={characterTemplates}
            onTemplateChange={(templateId) => {
              setSelectedTemplateId(templateId)
              setSelectedSavedSetupId('')
              setDraftBeforeSavedLoad(null)
              setSetupNotice('')
              if (!templateId) {
                setOrbmentState(createInitialOrbmentState(base.topology))
                return
              }
              const selectedTemplate = characterTemplates.find((template) => template.id === templateId)
              if (!selectedTemplate) {
                return
              }
              const presetState = createOrbmentStateFromPreset(selectedTemplate.presetShape, base.topology)
              const withRestrictions = applyPresetRestrictions(presetState, selectedTemplate.restriction)
              setOrbmentState(withRestrictions)
            }}
          />
        </TabsContent>
        <TabsContent className="text-base outline-none" value="arts">
          <ArtsList
            arts={evaluation.availableArts}
            lineTotals={evaluation.lineTotals}
            elementOrderSource={base.arts}
          />
        </TabsContent>
      </Tabs>
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

function toExportFileName(name: string): string {
  const sanitized = name
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return sanitized || 'setup'
}

function cloneOrbmentState(state: OrbmentState): OrbmentState {
  return {
    ...state,
    arcLengths: [...state.arcLengths],
    lineStarts: [...state.lineStarts],
    lineDirections: [...state.lineDirections],
    slotRestrictions: { ...state.slotRestrictions },
    equippedQuartz: { ...state.equippedQuartz },
    nodeTiers: { ...state.nodeTiers },
    equippedMasterQuartzId: state.equippedMasterQuartzId,
    masterQuartzLevel: state.masterQuartzLevel,
  }
}
