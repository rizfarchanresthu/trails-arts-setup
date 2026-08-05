import type { FilterOptionOption, GroupBase } from 'react-select'
import { ELEMENT_COLORS, ELEMENTS, type ElementName, type MasterQuartz } from '../domain/types'
import { AppSelect, type SelectGroup, type SelectOption } from './AppSelect'

type MasterQuartzPickerProps = {
  masterQuartzList: MasterQuartz[]
  value: number | null
  onChange: (masterQuartzId: number | null) => void
}

function filterMasterQuartzOption(option: FilterOptionOption<SelectOption>, inputValue: string): boolean {
  const query = inputValue.trim().toLowerCase()
  if (!query) {
    return true
  }

  const haystack = `${option.label} ${option.value} ${option.data.searchText ?? ''}`.toLowerCase()
  return haystack.includes(query)
}

function formatMasterQuartzGroupLabel(group: GroupBase<SelectOption>) {
  const element = group.label
  if (!element || !ELEMENTS.includes(element as ElementName)) {
    return group.label
  }

  return (
    <span className="elementBadge" style={{ color: ELEMENT_COLORS[element as ElementName] }}>
      {element}
    </span>
  )
}

function formatMasterQuartzOptionLabel(option: SelectOption) {
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

export function MasterQuartzPicker({ masterQuartzList, value, onChange }: MasterQuartzPickerProps) {
  const groupedOptions: Array<SelectOption | SelectGroup> = [
    { value: '', label: 'Empty slot' },
    ...ELEMENTS.flatMap((element): SelectGroup[] => {
      const options = masterQuartzList
        .filter((masterQuartz) => masterQuartz.element === element)
        .map((masterQuartz) => ({
          value: String(masterQuartz.id),
          label: masterQuartz.name.en,
          element: masterQuartz.element,
          searchText: `${masterQuartz.name.en} ${masterQuartz.element} ${masterQuartz.description}`,
        }))

      if (options.length === 0) {
        return []
      }

      return [{ label: element, options }]
    }),
  ]

  return (
    <AppSelect
      value={value == null ? '' : String(value)}
      options={groupedOptions}
      onChange={(nextValue) => onChange(nextValue ? Number(nextValue) : null)}
      isSearchable
      isClearable={value != null}
      placeholder="Empty slot"
      filterOption={filterMasterQuartzOption}
      formatGroupLabel={formatMasterQuartzGroupLabel}
      formatOptionLabel={formatMasterQuartzOptionLabel}
    />
  )
}
