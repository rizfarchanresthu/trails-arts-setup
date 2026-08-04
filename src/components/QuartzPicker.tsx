import { type Quartz } from '../domain/types'

type QuartzPickerProps = {
  quartzList: Quartz[]
  value: number | null
  onChange: (quartzId: number | null) => void
}

export function QuartzPicker({ quartzList, value, onChange }: QuartzPickerProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
    >
      <option value="">Empty slot</option>
      {quartzList.map((quartz) => (
        <option key={quartz.id} value={quartz.id}>
          {quartz.name.en} ({quartz.element}
          {quartz.tier ? `, T${quartz.tier}` : ''})
        </option>
      ))}
    </select>
  )
}
