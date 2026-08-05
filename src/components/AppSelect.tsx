import type { ReactNode } from 'react'
import Select, {
  type FilterOptionOption,
  type FormatOptionLabelMeta,
  type GroupBase,
  type StylesConfig,
} from 'react-select'
import { type ElementName } from '../domain/types'

export type SelectOption = {
  value: string
  label: string
  searchText?: string
  element?: ElementName
  tier?: number
}

export type SelectGroup = {
  label: string
  options: SelectOption[]
}

export type SelectOptions = Array<SelectOption | SelectGroup>

type AppSelectProps = {
  value: string
  options: SelectOptions
  onChange: (value: string) => void
  isClearable?: boolean
  isSearchable?: boolean
  placeholder?: string
  className?: string
  filterOption?: (option: FilterOptionOption<SelectOption>, inputValue: string) => boolean
  formatGroupLabel?: (group: GroupBase<SelectOption>) => ReactNode
  formatOptionLabel?: (option: SelectOption, meta: FormatOptionLabelMeta<SelectOption>) => ReactNode
}

function isSelectGroup(item: SelectOption | SelectGroup): item is SelectGroup {
  return 'options' in item
}

function findOption(options: SelectOptions, value: string): SelectOption | null {
  for (const item of options) {
    if (isSelectGroup(item)) {
      const match = item.options.find((option) => option.value === value)
      if (match) {
        return match
      }
    } else if (item.value === value) {
      return item
    }
  }
  return null
}

const selectStyles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    borderRadius: 8,
    borderColor: state.isFocused ? 'var(--text-h)' : 'var(--border)',
    backgroundColor: 'var(--bg)',
    boxShadow: 'none',
    '&:hover': {
      borderColor: 'var(--text-h)',
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0.2rem 0.5rem',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--text-h)',
  }),
  input: (base) => ({
    ...base,
    color: 'var(--text-h)',
    margin: 0,
    padding: 0,
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--text)',
    opacity: 0.7,
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'var(--text)',
    padding: '0 8px',
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--text)',
    padding: '0 4px',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(15, 17, 21, 0.12)',
    overflow: 'hidden',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 40,
  }),
  menuList: (base) => ({
    ...base,
    padding: '0.25rem',
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: 6,
    backgroundColor: state.isSelected
      ? 'color-mix(in oklab, var(--text-h) 12%, var(--bg))'
      : state.isFocused
        ? 'color-mix(in oklab, var(--text-h) 6%, var(--bg))'
        : 'transparent',
    color: 'var(--text-h)',
    cursor: 'pointer',
  }),
  groupHeading: (base) => ({
    ...base,
    color: 'var(--text)',
    fontWeight: 700,
    fontSize: '0.75rem',
    textTransform: 'none',
    letterSpacing: '0.02em',
  }),
}

export function AppSelect({
  value,
  options,
  onChange,
  isClearable = false,
  isSearchable = false,
  placeholder,
  className,
  filterOption,
  formatGroupLabel,
  formatOptionLabel,
}: AppSelectProps) {
  return (
    <Select<SelectOption, false, GroupBase<SelectOption>>
      className={['appSelect', className].filter(Boolean).join(' ')}
      classNamePrefix="appSelect"
      value={findOption(options, value)}
      options={options}
      onChange={(option) => onChange(option?.value ?? '')}
      isClearable={isClearable}
      isSearchable={isSearchable}
      placeholder={placeholder}
      styles={selectStyles}
      menuPortalTarget={document.body}
      menuPlacement="auto"
      menuPosition="fixed"
      filterOption={filterOption}
      formatGroupLabel={formatGroupLabel}
      formatOptionLabel={formatOptionLabel}
    />
  )
}
