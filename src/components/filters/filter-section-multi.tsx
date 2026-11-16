import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { FilterSectionConfig } from './types'

interface FilterSectionMultiProps {
  section: Extract<FilterSectionConfig, { type: 'multi' }>
  value: string[]
  onChange: (value: string[]) => void
}

export function FilterSectionMulti({ section, value, onChange }: FilterSectionMultiProps) {
  const [search, setSearch] = useState('')
  const options = section.options ?? []
  const showSearch = section.searchable ?? options.length > 8
  const normalizedSearch = search.trim().toLocaleLowerCase('es-ES')
  const filteredOptions = options.filter((option) => {
    if (!normalizedSearch) {
      return true
    }

    return (
      option.label.toLocaleLowerCase('es-ES').includes(normalizedSearch) ||
      option.value.toLocaleLowerCase('es-ES').includes(normalizedSearch)
    )
  })

  const toggleValue = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((entry) => entry !== optionValue))
      return
    }

    onChange([...value, optionValue])
  }

  if (section.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {showSearch ? (
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Buscar ${section.label.toLocaleLowerCase('es-ES')}...`}
        />
      ) : null}

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => {
            const checked = value.includes(option.value)

            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-none border border-border px-3 py-2 text-sm transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-card has-[:checked]:bg-lime-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleValue(option.value)}
                  className="mt-0.5 h-4 w-4 flex-none rounded-none border-input accent-primary hover:border-control-border-hover"
                />
                <span className="min-w-0 flex-1 whitespace-normal break-words leading-5 text-foreground">
                  {option.label}
                </span>
              </label>
            )
          })
        ) : (
          <p className="rounded-none border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No hay opciones para mostrar.
          </p>
        )}
      </div>
    </div>
  )
}
