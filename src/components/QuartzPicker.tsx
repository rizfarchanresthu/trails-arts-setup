import type { FilterOptionOption, GroupBase } from 'react-select'
import { ELEMENT_COLORS, ELEMENTS, LOST_QUARTZ_COLOR, isLostQuartz, type ElementName, type Quartz } from '../domain/types'
import { AppSelect, type SelectGroup, type SelectOption } from './AppSelect'

type QuartzPickerProps = {
  quartzList: Quartz[]
  value: number | null
  onChange: (quartzId: number | null) => void
}

function parseQuartzSearch(input: string): { text: string; maxTier: number | null } {
  let maxTier: number | null = null
  const text = input
    .replace(/\b(?:t|tier)\s*([0-3])\b/gi, (_, digit: string) => {
      const nextTier = Number(digit)
      maxTier = maxTier == null ? nextTier : Math.max(maxTier, nextTier)
      return ' '
    })
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  return { text, maxTier }
}

function filterQuartzOption(option: FilterOptionOption<SelectOption>, inputValue: string): boolean {
  const query = inputValue.trim()
  if (!query) {
    return true
  }

  const { text, maxTier } = parseQuartzSearch(query)
  if (maxTier != null && (option.data.tier ?? 1) > maxTier) {
    return false
  }

  if (!text) {
    return true
  }

  const haystack = `${option.label} ${option.value} ${option.data.searchText ?? ''}`.toLowerCase()
  return haystack.includes(text)
}

function formatQuartzGroupLabel(group: GroupBase<SelectOption>) {
  const element = group.label
  if (element === 'Lost') {
    return (
      <span className="elementBadge" style={{ color: LOST_QUARTZ_COLOR }}>
        Lost
      </span>
    )
  }
  if (!element || !ELEMENTS.includes(element as ElementName)) {
    return group.label
  }

  return (
    <span className="elementBadge" style={{ color: ELEMENT_COLORS[element as ElementName] }}>
      {element}
    </span>
  )
}

function formatQuartzOptionLabel(option: SelectOption) {
  const swatchColor = option.swatchColor ?? (option.element ? ELEMENT_COLORS[option.element] : null)
  if (!swatchColor) {
    return option.label
  }

  return (
    <span className="quartzOptionLabel">
      <span className="quartzElementSwatch" style={{ backgroundColor: swatchColor }} />
      {option.label}
    </span>
  )
}

export function QuartzPicker({ quartzList, value, onChange }: QuartzPickerProps) {
  const lostOptions = quartzList.filter(isLostQuartz).map((quartz) => ({
    value: String(quartz.id),
    label: quartz.name.en,
    swatchColor: LOST_QUARTZ_COLOR,
    tier: quartz.tier ?? 1,
    searchText: `${quartz.name.en} Lost ${quartz.element.join(' ')}`,
  }))

  const groupedOptions: Array<SelectOption | SelectGroup> = [
    { value: '', label: 'Empty slot' },
    ...ELEMENTS.flatMap((element): SelectGroup[] => {
      const options = quartzList
        .filter((quartz): quartz is Quartz & { element: ElementName } => !isLostQuartz(quartz) && quartz.element === element)
        .map((quartz) => ({
          value: String(quartz.id),
          label: quartz.name.en,
          element: quartz.element,
          tier: quartz.tier ?? 1,
          searchText: `${quartz.name.en} ${quartz.element}`,
        }))

      if (options.length === 0) {
        return []
      }

      return [{ label: element, options }]
    }),
    ...(lostOptions.length > 0 ? [{ label: 'Lost', options: lostOptions }] : []),
  ]

  return (
    <AppSelect
      value={value == null ? '' : String(value)}
      options={groupedOptions}
      onChange={(nextValue) => onChange(nextValue ? Number(nextValue) : null)}
      isSearchable
      isClearable={value != null}
      placeholder="Empty slot"
      filterOption={filterQuartzOption}
      formatGroupLabel={formatQuartzGroupLabel}
      formatOptionLabel={formatQuartzOptionLabel}
    />
  )
}
