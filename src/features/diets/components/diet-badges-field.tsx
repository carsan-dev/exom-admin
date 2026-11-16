import { useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useDietNutritionalBadgeCatalogColors, useDietNutritionalBadges } from '../api'
import { getDietBadgeColorMap, getDietNutritionalBadgeStyle } from '../types'

const NUTRITIONAL_BADGE_OPTIONS = [
  'Fibra',
  'Proteína',
  'Carbos',
  'Grasa',
  'Alto en proteína',
  'Bajo en calorías',
  'Sin gluten',
  'Vegano',
] as const

function normalizeBadgeLabel(badge: string) {
  return badge.trim().replace(/\s+/g, ' ')
}

function getBadgeKey(badge: string) {
  return normalizeBadgeLabel(badge)
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
}

export function BadgesField({
  value,
  onChange,
}: {
  value: string[]
  onChange: (val: string[]) => void
}) {
  const [input, setInput] = useState('')
  const badgesQuery = useDietNutritionalBadges()
  const badgeColorsQuery = useDietNutritionalBadgeCatalogColors()
  const badgeColorMap = getDietBadgeColorMap(badgeColorsQuery.data)
  const badgeOptions = mergeBadgeOptions(NUTRITIONAL_BADGE_OPTIONS, badgesQuery.data)

  const hasBadge = (badge: string) => {
    const badgeKey = getBadgeKey(badge)
    return value.some((current) => getBadgeKey(current) === badgeKey)
  }

  const remove = (badge: string) => {
    const badgeKey = getBadgeKey(badge)
    onChange(value.filter((current) => getBadgeKey(current) !== badgeKey))
  }

  const toggle = (badge: string) => {
    const normalizedBadge = normalizeBadgeLabel(badge)

    if (!normalizedBadge) {
      return
    }

    if (hasBadge(normalizedBadge)) {
      remove(normalizedBadge)
      return
    }

    onChange([...value, normalizedBadge])
  }

  const add = () => {
    const normalizedInput = normalizeBadgeLabel(input)
    if (normalizedInput && !hasBadge(normalizedInput)) {
      onChange([...value, normalizedInput])
    }
    setInput('')
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((badge) => (
            <Badge
              key={badge}
              variant="outline"
              className="gap-1 pr-1 text-xs"
              style={getDietNutritionalBadgeStyle(badge, badgeColorMap)}
            >
              {badge}
              <button
                type="button"
                onClick={() => remove(badge)}
                className="ml-0.5 rounded-full hover:text-status-error"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-none">
              Opciones
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-60 w-48 overflow-y-auto">
            {badgeOptions.map((badge) => (
              <DropdownMenuCheckboxItem
                key={badge}
                checked={hasBadge(badge)}
                onCheckedChange={() => toggle(badge)}
              >
                {badge}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Otro badge (Enter para añadir)"
          className="h-7 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs flex-none"
          onClick={add}
          disabled={!normalizeBadgeLabel(input) || hasBadge(input)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function mergeBadgeOptions(preset: readonly string[], fetched: string[] | undefined) {
  const unique = new Map<string, string>()

  for (const label of [...preset, ...(fetched ?? [])]) {
    const normalized = normalizeBadgeLabel(label)

    if (!normalized) continue

    const key = getBadgeKey(normalized)

    if (!unique.has(key)) {
      unique.set(key, normalized)
    }
  }

  return Array.from(unique.values()).sort((left, right) =>
    left.localeCompare(right, 'es', { sensitivity: 'base' })
  )
}
