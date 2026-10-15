import { useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MasterQuartzSchema } from '../domain/masterQuartzSchemas'
import { ELEMENTS, ELEMENT_COLORS, type CustomMasterQuartzEntry, type ElementName } from '../domain/types'
import {
  createEmptyLevelDraft,
  type MasterQuartzDraft,
  type MasterQuartzLevelDraft,
} from '../state/masterQuartzDraft'
import { AppSelect, type SelectOption } from './AppSelect'

export type MasterQuartzNoticeTone = 'default' | 'success' | 'error'

type MasterQuartzEditorProps = {
  baseLabel: string
  schema: MasterQuartzSchema | null
  entries: CustomMasterQuartzEntry[]
  selectedId: number | null
  draft: MasterQuartzDraft
  notice: string
  noticeTone: MasterQuartzNoticeTone
  onSelect: (id: number | null) => void
  onDraftChange: (draft: MasterQuartzDraft) => void
  onNew: () => void
  onSave: () => void
  onSaveAs: () => void
  onDelete: () => void
  onExport: () => void
  onImportFile: (file: File) => void
}

const ELEMENT_OPTIONS: SelectOption[] = ELEMENTS.map((element) => ({ value: element, label: element, element }))

function formatElementOptionLabel(option: SelectOption) {
  if (!option.element) {
    return option.label
  }
  return (
    <span className="quartzOptionLabel">
      <span className="quartzElementSwatch" style={{ backgroundColor: ELEMENT_COLORS[option.element] }} />
      {option.label}
    </span>
  )
}

export function MasterQuartzEditor({
  baseLabel,
  schema,
  entries,
  selectedId,
  draft,
  notice,
  noticeTone,
  onSelect,
  onDraftChange,
  onNew,
  onSave,
  onSaveAs,
  onDelete,
  onExport,
  onImportFile,
}: MasterQuartzEditorProps) {
  const importFileInputRef = useRef<HTMLInputElement>(null)

  function updateDraft(patch: Partial<MasterQuartzDraft>): void {
    onDraftChange({ ...draft, ...patch })
  }

  function updateLevel(levelIndex: number, patch: Partial<MasterQuartzLevelDraft>): void {
    updateDraft({
      levels: draft.levels.map((level, index) => (index === levelIndex ? { ...level, ...patch } : level)),
    })
  }

  function setLevelCount(count: number): void {
    if (count <= draft.levels.length) {
      updateDraft({ levels: draft.levels.slice(0, count) })
      return
    }
    const added = Array.from({ length: count - draft.levels.length }, () => createEmptyLevelDraft(draft.element))
    updateDraft({ levels: [...draft.levels, ...added] })
  }

  const showElementalValues = schema?.levelFields.includes('elemental_value') ?? false
  const showEffects = schema?.levelFields.includes('effects') ?? false

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Custom Master Quartz ({baseLabel})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-end gap-3">
            {schema ? (
              <Label className="grid min-w-56 gap-1.5 font-normal">
                Custom master quartz
                <AppSelect
                  value={selectedId == null ? '' : String(selectedId)}
                  options={[
                    { value: '', label: 'New master quartz' },
                    ...entries.map((entry) => ({
                      value: String(entry.masterQuartz.id),
                      label: entry.masterQuartz.name.en,
                      element: entry.masterQuartz.element,
                    })),
                  ]}
                  onChange={(nextValue) => onSelect(nextValue ? Number(nextValue) : null)}
                  formatOptionLabel={formatElementOptionLabel}
                />
              </Label>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {schema ? (
                <>
                  <Button type="button" variant="outline" onClick={onNew}>
                    New
                  </Button>
                  <Button type="button" onClick={onSave}>
                    Save
                  </Button>
                  <Button type="button" variant="outline" onClick={onSaveAs}>
                    Save As
                  </Button>
                  <Button type="button" variant="destructive" onClick={onDelete} disabled={selectedId == null}>
                    Delete
                  </Button>
                  <Button type="button" variant="outline" onClick={onExport}>
                    Export
                  </Button>
                </>
              ) : null}
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
                  if (file) {
                    onImportFile(file)
                  }
                }}
              />
            </div>
          </div>
          {notice ? (
            <Alert variant={noticeTone === 'error' ? 'destructive' : noticeTone === 'success' ? 'success' : 'default'}>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}
          {!schema ? (
            <p className="text-sm text-muted-foreground">
              Master quartz creation isn't available for {baseLabel} yet. You can still import a master quartz exported
              from a supported base.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {schema ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Label className="grid gap-1.5 font-normal">
                Name (English)
                <Input value={draft.nameEn} onChange={(event) => updateDraft({ nameEn: event.target.value })} />
              </Label>
              <Label className="grid gap-1.5 font-normal">
                Name (Japanese)
                <Input value={draft.nameJa} onChange={(event) => updateDraft({ nameJa: event.target.value })} />
              </Label>
              <Label className="grid gap-1.5 font-normal">
                Element
                <AppSelect
                  value={draft.element}
                  options={ELEMENT_OPTIONS}
                  onChange={(nextValue) => {
                    if (nextValue) {
                      updateDraft({ element: nextValue as ElementName })
                    }
                  }}
                  formatOptionLabel={formatElementOptionLabel}
                />
              </Label>
              <Label className="grid gap-1.5 font-normal">
                Image URL
                <Input
                  value={draft.imageUrl}
                  placeholder="https://..."
                  onChange={(event) => updateDraft({ imageUrl: event.target.value })}
                />
              </Label>
              <Label className="grid gap-1.5 font-normal sm:col-span-2">
                Description
                <textarea
                  className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                  value={draft.description}
                  onChange={(event) => updateDraft({ description: event.target.value })}
                />
              </Label>
              <Label className="grid gap-1.5 font-normal">
                Levels
                <AppSelect
                  value={String(draft.levels.length)}
                  options={Array.from({ length: schema.maxLevels }, (_, index) => ({
                    value: String(index + 1),
                    label: String(index + 1),
                  }))}
                  onChange={(nextValue) => setLevelCount(Number(nextValue))}
                />
              </Label>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {draft.levels.map((level, levelIndex) => (
              <Card key={`mq-level-${levelIndex}`} size="sm">
                <CardHeader>
                  <CardTitle>Level {levelIndex + 1}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {showElementalValues ? (
                    <div className="grid gap-2">
                      <span className="text-sm font-medium">Elemental value</span>
                      {level.elementalValues.map((requirement, requirementIndex) => (
                        <div key={`ev-${requirementIndex}`} className="flex items-center gap-2">
                          <AppSelect
                            className="min-w-36 flex-1"
                            value={requirement.element}
                            options={ELEMENT_OPTIONS}
                            onChange={(nextValue) => {
                              if (!nextValue) {
                                return
                              }
                              updateLevel(levelIndex, {
                                elementalValues: level.elementalValues.map((entry, index) =>
                                  index === requirementIndex ? { ...entry, element: nextValue as ElementName } : entry,
                                ),
                              })
                            }}
                            formatOptionLabel={formatElementOptionLabel}
                          />
                          <Input
                            className="w-20"
                            type="number"
                            min={1}
                            step={1}
                            value={requirement.value}
                            aria-label="Value"
                            onChange={(event) =>
                              updateLevel(levelIndex, {
                                elementalValues: level.elementalValues.map((entry, index) =>
                                  index === requirementIndex ? { ...entry, value: event.target.value } : entry,
                                ),
                              })
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove elemental value"
                            onClick={() =>
                              updateLevel(levelIndex, {
                                elementalValues: level.elementalValues.filter((_, index) => index !== requirementIndex),
                              })
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-fit"
                        onClick={() =>
                          updateLevel(levelIndex, {
                            elementalValues: [...level.elementalValues, { element: draft.element, value: '' }],
                          })
                        }
                      >
                        <Plus />
                        Add element
                      </Button>
                    </div>
                  ) : null}
                  {showEffects ? (
                    <div className="grid gap-2">
                      <span className="text-sm font-medium">Effects</span>
                      {level.effects.map((effect, effectIndex) => (
                        <div key={`effect-${effectIndex}`} className="flex items-start gap-2">
                          <div className="grid flex-1 gap-1.5">
                            <Input
                              value={effect.title}
                              placeholder="Title"
                              onChange={(event) =>
                                updateLevel(levelIndex, {
                                  effects: level.effects.map((entry, index) =>
                                    index === effectIndex ? { ...entry, title: event.target.value } : entry,
                                  ),
                                })
                              }
                            />
                            <Input
                              value={effect.detail}
                              placeholder="Detail"
                              onChange={(event) =>
                                updateLevel(levelIndex, {
                                  effects: level.effects.map((entry, index) =>
                                    index === effectIndex ? { ...entry, detail: event.target.value } : entry,
                                  ),
                                })
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove effect"
                            onClick={() =>
                              updateLevel(levelIndex, {
                                effects: level.effects.filter((_, index) => index !== effectIndex),
                              })
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-fit"
                        onClick={() => updateLevel(levelIndex, { effects: [...level.effects, { title: '', detail: '' }] })}
                      >
                        <Plus />
                        Add effect
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
