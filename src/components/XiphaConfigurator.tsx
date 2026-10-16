import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { type XiphaCharacterTemplate } from '../domain/characterPresets'
import {
  ELEMENTS,
  LINE_COLORS,
  XIPHA_LINE_LABELS,
  XIPHA_LINE_TYPES,
  XIPHA_MAX_LINE_SLOTS,
  XIPHA_MIN_LINE_SLOTS,
  formatXiphaSlotLabel,
  getXiphaLineSlotIds,
  quartzFitsSlotRestriction,
  quartzFitsXiphaSlot,
  ELEMENT_COLORS,
  type ArtsDriver,
  type ArtsPlugin,
  type ElementName,
  type ElementRequirement,
  type HoloCore,
  type Quartz,
  type ShardSkill,
  type SlotId,
  type XiphaLineType,
} from '../domain/types'
import { type XiphaLineTotals } from '../domain/xiphaEvaluator'
import { type OrbmentState } from '../state/orbmentState'
import {
  getAllowedQuartzForXiphaSlot,
  getCumulativeArtsDriverArts,
  getHoloCoreLevelData,
  getXiphaState,
  getXiphaTotalSlotCount,
  isXiphaSlotActive,
} from '../state/xiphaState'
import { AppSelect, type SelectGroup, type SelectOption } from './AppSelect'
import { QuartzPicker } from './QuartzPicker'
import { XiphaGraph } from './XiphaGraph'

type XiphaConfiguratorProps = {
  title: string
  state: OrbmentState
  quartzList: Quartz[]
  quartzById: Map<number, Quartz>
  holoCores: HoloCore[]
  artsDrivers: ArtsDriver[]
  artsPlugins: ArtsPlugin[]
  lineTotals: XiphaLineTotals
  activeShardSkills: ShardSkill[]
  characterTemplates: XiphaCharacterTemplate[]
  selectedTemplateId: string
  onTemplateChange: (templateId: string) => void
  onLineSlotCountChange: (lineType: XiphaLineType, count: number) => void
  onRestrictionChange: (slotId: SlotId, restriction: ElementName | null) => void
  onQuartzChange: (slotId: SlotId, quartzId: number | null) => void
  onHoloCoreChange: (holoCoreId: number | null) => void
  onHoloCoreLevelChange: (level: number) => void
  onArtsDriverChange: (artsDriverId: number | null) => void
  onArtsDriverLevelChange: (level: number) => void
  onArtsPluginChange: (slotIndex: number, pluginId: number | null) => void
}

export function XiphaConfigurator({
  title,
  state,
  quartzList,
  quartzById,
  holoCores,
  artsDrivers,
  artsPlugins,
  lineTotals,
  activeShardSkills,
  characterTemplates,
  selectedTemplateId,
  onTemplateChange,
  onLineSlotCountChange,
  onRestrictionChange,
  onQuartzChange,
  onHoloCoreChange,
  onHoloCoreLevelChange,
  onArtsDriverChange,
  onArtsDriverLevelChange,
  onArtsPluginChange,
}: XiphaConfiguratorProps) {
  const xipha = getXiphaState(state)
  const holoCore = holoCores.find((entry) => entry.id === xipha.holoCoreId) ?? null
  const artsDriver = artsDrivers.find((entry) => entry.id === xipha.artsDriverId) ?? null
  const equippedPlugins = xipha.artsPluginIds
    .map((pluginId) => (pluginId == null ? null : (artsPlugins.find((entry) => entry.id === pluginId) ?? null)))
    .filter((plugin): plugin is ArtsPlugin => plugin != null)
  const holoCoreLevelData = getHoloCoreLevelData(holoCore, xipha.holoCoreLevel)
  const unlockedArts = artsDriver
    ? getCumulativeArtsDriverArts(artsDriver, xipha.artsDriverLevel, equippedPlugins)
    : []
  const slotCountOptions = Array.from(
    { length: XIPHA_MAX_LINE_SLOTS - XIPHA_MIN_LINE_SLOTS + 1 },
    (_, index) => XIPHA_MIN_LINE_SLOTS + index,
  ).map((count) => ({ value: String(count), label: String(count) }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title} Config</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="configWithGraph">
          <div className="configColumn grid gap-4">
            <Label className="grid min-w-40 gap-1.5 font-normal">
              Character preset
              <AppSelect
                value={selectedTemplateId}
                isSearchable
                options={[
                  { value: '', label: 'Custom' },
                  ...characterTemplates.map((template) => ({ value: template.id, label: template.name })),
                ]}
                onChange={onTemplateChange}
              />
            </Label>

            <div className="grid gap-2">
              <h3 className="text-sm font-medium">Slots per line ({getXiphaTotalSlotCount(xipha)} total)</h3>
              <div className="flex flex-wrap items-end gap-3">
                {XIPHA_LINE_TYPES.map((lineType) => (
                  <Label key={`slot-count-${lineType}`} className="grid min-w-24 gap-1.5 font-normal">
                    {XIPHA_LINE_LABELS[lineType]}
                    <AppSelect
                      value={String(xipha.lineSlotCounts[lineType])}
                      options={slotCountOptions}
                      onChange={(nextValue) => onLineSlotCountChange(lineType, Number(nextValue))}
                    />
                  </Label>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label className="grid gap-1.5 font-normal">
                Holo Core
                <AppSelect
                  value={xipha.holoCoreId == null ? '' : String(xipha.holoCoreId)}
                  isSearchable
                  isClearable={xipha.holoCoreId != null}
                  placeholder="None"
                  options={[
                    { value: '', label: 'None' },
                    ...holoCores.map((entry) => ({ value: String(entry.id), label: entry.name.en })),
                  ]}
                  onChange={(nextValue) => onHoloCoreChange(nextValue ? Number(nextValue) : null)}
                />
              </Label>
              {holoCore ? (
                <>
                  <p className="text-sm text-muted-foreground">{holoCore.description}</p>
                  <Label className="grid gap-1.5 font-normal">
                    Holo Core level
                    <AppSelect
                      value={String(xipha.holoCoreLevel)}
                      options={holoCore.levels.map((entry) => ({
                        value: String(entry.level),
                        label: `Level ${entry.level}`,
                      }))}
                      onChange={(nextValue) => onHoloCoreLevelChange(Number(nextValue))}
                    />
                  </Label>
                  {holoCoreLevelData ? (
                    <>
                      {holoCoreLevelData.effects.length > 0 ? (
                        <ul className="grid list-disc gap-1 pl-5 text-sm">
                          {holoCoreLevelData.effects.map((effect, index) => (
                            <li key={`holo-core-effect-${index}`}>
                              <strong>{effect.title}</strong>
                              {effect.detail ? `: ${effect.detail}` : ''}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {holoCore.s_boost_ability || holoCoreLevelData.boost_effects.length > 0 ? (
                        <div className="grid gap-1">
                          <h4 className="text-sm font-medium">When Boosted</h4>
                          {holoCore.s_boost_ability ? (
                            <p className="text-sm text-muted-foreground">
                              S-Boost Ability: {holoCore.s_boost_ability}
                            </p>
                          ) : null}
                          {holoCoreLevelData.boost_effects.length > 0 ? (
                            <ul className="grid list-disc gap-1 pl-5 text-sm">
                              {holoCoreLevelData.boost_effects.map((effect, index) => (
                                <li key={`holo-core-boost-${index}`}>
                                  <strong>{effect.title}</strong>
                                  {effect.detail ? `: ${effect.detail}` : ''}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label className="grid gap-1.5 font-normal">
                Arts Driver
                <AppSelect
                  value={xipha.artsDriverId == null ? '' : String(xipha.artsDriverId)}
                  isSearchable
                  isClearable={xipha.artsDriverId != null}
                  placeholder="None"
                  options={[
                    { value: '', label: 'None' },
                    ...artsDrivers.map((entry) => ({ value: String(entry.id), label: entry.name.en })),
                  ]}
                  onChange={(nextValue) => onArtsDriverChange(nextValue ? Number(nextValue) : null)}
                />
              </Label>
              {artsDriver ? (
                <>
                  <p className="text-sm text-muted-foreground">{artsDriver.description}</p>
                  <Label className="grid gap-1.5 font-normal">
                    Arts Driver level
                    <AppSelect
                      value={String(xipha.artsDriverLevel)}
                      options={artsDriver.levels.map((entry) => ({
                        value: String(entry.level),
                        label: `Level ${entry.level}`,
                      }))}
                      onChange={(nextValue) => onArtsDriverLevelChange(Number(nextValue))}
                    />
                  </Label>
                  {xipha.artsPluginIds.length > 0 ? (
                    <div className="grid gap-2">
                      <h4 className="text-sm font-medium">Arts Plugins</h4>
                      <div className="grid gap-2">
                        {xipha.artsPluginIds.map((pluginId, slotIndex) => {
                          const selectedPlugin =
                            pluginId == null
                              ? null
                              : (artsPlugins.find((entry) => entry.id === pluginId) ?? null)
                          return (
                            <div key={`arts-plugin-slot-${slotIndex}`} className="grid gap-1">
                              <Label className="grid gap-1.5 font-normal">
                                Plugin {slotIndex + 1}
                                <AppSelect
                                  value={pluginId == null ? '' : String(pluginId)}
                                  isSearchable
                                  isClearable={pluginId != null}
                                  placeholder="None"
                                  options={buildArtsPluginOptions(
                                    artsPlugins,
                                    xipha.artsPluginIds,
                                    slotIndex,
                                  )}
                                  onChange={(nextValue) =>
                                    onArtsPluginChange(slotIndex, nextValue ? Number(nextValue) : null)
                                  }
                                  formatOptionLabel={formatArtsPluginOptionLabel}
                                />
                              </Label>
                              {selectedPlugin ? (
                                <p className="text-xs text-muted-foreground">
                                  {selectedPlugin.element}
                                  {selectedPlugin.obtain ? ` · ${selectedPlugin.obtain}` : ''}
                                </p>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div className="grid gap-1">
                    <h4 className="text-sm font-medium">Arts ({unlockedArts.length})</h4>
                    {unlockedArts.length > 0 ? (
                      <ul className="grid list-disc gap-1 pl-5 text-sm">
                        {unlockedArts.map((art) => (
                          <li key={`arts-driver-art-${art}`}>{art}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No arts unlocked at this level.</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <Alert>
              <AlertDescription>
                Holo Core and Arts Driver effects apply in-game only; they do not change element totals or Shard
                Skills here.
              </AlertDescription>
            </Alert>

            <Separator />

            <div className="grid gap-2">
              <h3 className="text-sm font-medium">Xipha Rules</h3>
              <p className="text-sm text-muted-foreground">
                Each line totals its own element values. Element-locked slots only accept quartz of that element, and
                all of that quartz&apos;s element values count double. Some quartz can only be equipped in specific slot
                types.
              </p>
            </div>
          </div>

          <div className="graphColumn">
            <XiphaGraph
              title={title}
              state={state}
              quartzById={quartzById}
              holoCore={holoCore}
              artsDriver={artsDriver}
              artsPlugins={artsPlugins}
              lineTotals={lineTotals}
              activeShardSkills={activeShardSkills}
            />
          </div>
        </div>

        <div className="xiphaLineColumns">
          {XIPHA_LINE_TYPES.map((lineType, lineIndex) => (
            <div className="slotsLineColumn" key={`xipha-line-${lineType}`}>
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <span
                  className="size-3 shrink-0 rounded-sm border border-border"
                  style={{ backgroundColor: LINE_COLORS[lineIndex % LINE_COLORS.length] }}
                />
                {XIPHA_LINE_LABELS[lineType]}
              </h3>
              <p className="text-xs text-muted-foreground">{formatTotals(lineTotals[lineType])}</p>
              {getXiphaLineSlotIds(lineType)
                .filter((slotId) => isXiphaSlotActive(xipha, slotId))
                .map((slotId) => (
                  <XiphaSlotCard
                    key={`xipha-slot-${slotId}`}
                    slotId={slotId}
                    lineType={lineType}
                    state={state}
                    quartzList={quartzList}
                    quartzById={quartzById}
                    onRestrictionChange={onRestrictionChange}
                    onQuartzChange={onQuartzChange}
                  />
                ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

type XiphaSlotCardProps = {
  slotId: SlotId
  lineType: XiphaLineType
  state: OrbmentState
  quartzList: Quartz[]
  quartzById: Map<number, Quartz>
  onRestrictionChange: (slotId: SlotId, restriction: ElementName | null) => void
  onQuartzChange: (slotId: SlotId, quartzId: number | null) => void
}

function XiphaSlotCard({
  slotId,
  lineType,
  state,
  quartzList,
  quartzById,
  onRestrictionChange,
  onQuartzChange,
}: XiphaSlotCardProps) {
  const restriction = state.slotRestrictions[slotId]
  const allowedQuartz = getAllowedQuartzForXiphaSlot(quartzList, slotId, state, quartzById)
  const slotTypeQuartz = quartzList.filter(
    (quartz) => quartzFitsXiphaSlot(quartz, slotId) && quartzFitsSlotRestriction(quartz, restriction),
  )
  const hiddenByExclusivity = slotTypeQuartz.length - allowedQuartz.length
  const equippedId = state.equippedQuartz[slotId]
  const equipped = equippedId ? quartzById.get(equippedId) : null

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          Slot {formatXiphaSlotLabel(slotId)} ({XIPHA_LINE_LABELS[lineType]})
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Label className="grid gap-1.5 font-normal">
          Element lock
          <AppSelect
            value={restriction ?? ''}
            options={[
              { value: '', label: 'None' },
              ...ELEMENTS.map((element) => ({ value: element, label: element })),
            ]}
            onChange={(nextValue) => onRestrictionChange(slotId, (nextValue as ElementName) || null)}
          />
        </Label>

        <Label className="grid gap-1.5 font-normal">
          Quartz
          <QuartzPicker
            quartzList={allowedQuartz}
            value={equippedId}
            onChange={(quartzId) => onQuartzChange(slotId, quartzId)}
          />
        </Label>

        {equipped && Array.isArray(equipped.elemental_value) ? (
          <p className="text-sm text-muted-foreground">
            Value: {formatSlotValue(equipped.elemental_value, restriction)}
          </p>
        ) : null}

        {hiddenByExclusivity > 0 ? (
          <Alert>
            <AlertDescription>Some quartz hidden by exclusive-group rules.</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}

function formatSlotValue(requirements: ElementRequirement[], lock: ElementName | null): string {
  if (requirements.length === 0) {
    return 'None'
  }
  return requirements
    .map((requirement) => {
      const label = requirement.element ?? (requirement.elements ?? []).join('/')
      return `${label} ${lock ? requirement.value * 2 : requirement.value}`
    })
    .join(', ')
    .concat(lock ? ' (x2 locked)' : '')
}

function formatTotals(totals: XiphaLineTotals[XiphaLineType]): string {
  const entries = Object.entries(totals).filter(([, value]) => value > 0)
  return entries.length > 0 ? entries.map(([element, value]) => `${element} ${value}`).join(', ') : 'No element value'
}

function buildArtsPluginOptions(
  artsPlugins: ArtsPlugin[],
  equippedIds: Array<number | null>,
  slotIndex: number,
): Array<SelectOption | SelectGroup> {
  const usedElsewhere = new Set(
    equippedIds.filter((id, index): id is number => id != null && index !== slotIndex),
  )
  const available = artsPlugins.filter((plugin) => !usedElsewhere.has(plugin.id))

  return [
    { value: '', label: 'None' },
    ...ELEMENTS.flatMap((element): SelectGroup[] => {
      const options = available
        .filter((plugin) => plugin.element === element)
        .map((plugin) => ({
          value: String(plugin.id),
          label: plugin.name.en,
          element: plugin.element,
          searchText: `${plugin.name.en} ${plugin.element} ${plugin.obtain}`,
        }))
      if (options.length === 0) {
        return []
      }
      return [{ label: element, options }]
    }),
  ]
}

function formatArtsPluginOptionLabel(option: SelectOption) {
  if (!option.element) {
    return option.label
  }
  return (
    <span className="flex items-center gap-2">
      <span
        className="quartzElementSwatch"
        style={{ backgroundColor: ELEMENT_COLORS[option.element] }}
      />
      {option.label}
    </span>
  )
}
