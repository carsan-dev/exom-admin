import { useState } from 'react'
import { ChevronDown, LoaderCircle, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage, useDietTags } from '../api'
import { getDietTagKey, normalizeDietTagLabel, normalizeDietTags } from '../schemas'

export function DietTagsField({
  value,
  onChange,
  error,
}: {
  value: string[]
  onChange: (value: string[]) => void
  error?: string
}) {
  const [input, setInput] = useState('')
  const tagsQuery = useDietTags()
  const availableTags = tagsQuery.data ?? []

  const hasTag = (tag: string) => {
    const tagKey = getDietTagKey(tag)
    return value.some((currentTag) => getDietTagKey(currentTag) === tagKey)
  }

  const add = (rawTag = input) => {
    const normalizedTag = normalizeDietTagLabel(rawTag)

    if (normalizedTag && !hasTag(normalizedTag)) {
      onChange(normalizeDietTags([...value, normalizedTag]))
    }

    setInput('')
  }

  const remove = (tag: string) => {
    const tagKey = getDietTagKey(tag)
    onChange(value.filter((currentTag) => getDietTagKey(currentTag) !== tagKey))
  }

  const toggle = (tag: string) => {
    const normalizedTag = normalizeDietTagLabel(tag)

    if (!normalizedTag) {
      return
    }

    if (hasTag(normalizedTag)) {
      remove(normalizedTag)
      return
    }

    onChange(normalizeDietTags([...value, normalizedTag]))
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 flex-wrap gap-1.5 rounded-md border border-input bg-input px-3 py-2">
        {value.length === 0 && (
          <span className="self-center text-sm text-muted-foreground">Sin etiquetas internas</span>
        )}
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="gap-1 border-brand-soft/40 bg-brand-soft/10 pr-1 text-accent-text"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`Quitar ${tag}`}
              className="relative ml-0.5 rounded-full p-0.5 hover:bg-brand-soft/20 max-md:after:absolute max-md:after:content-[''] max-md:after:inset-x-[min(0px,calc(50%-22px))] max-md:after:inset-y-[min(0px,calc(50%-22px))]"
            >
              <X aria-hidden="true" className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="sm:w-auto max-md:h-11">
              Etiquetas existentes
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-72 w-60 overflow-y-auto"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <DropdownMenuLabel>Etiquetas guardadas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tagsQuery.isLoading ? (
              <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                <LoaderCircle className="h-3 w-3 animate-spin" />
                Cargando etiquetas...
              </div>
            ) : tagsQuery.isError ? (
              <div className="px-2 py-2 text-xs text-status-error">
                {getApiErrorMessage(tagsQuery.error, 'No se han podido cargar las etiquetas')}
              </div>
            ) : availableTags.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                Aun no hay etiquetas guardadas.
              </div>
            ) : (
              availableTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={hasTag(tag)}
                  onCheckedChange={() => toggle(tag)}
                  onSelect={(selectEvent) => selectEvent.preventDefault()}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex flex-1 items-center gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                add()
              }
            }}
            placeholder="Nueva etiqueta interna (Enter)"
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-md:h-11"
            onClick={() => add()}
            disabled={!normalizeDietTagLabel(input) || hasTag(input)}
            aria-label="Añadir etiqueta interna"
          >
            <Plus aria-hidden="true" className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {tagsQuery.isError ? (
        <div className="flex items-center gap-2 text-xs text-status-error">
          <span>
            {getApiErrorMessage(
              tagsQuery.error,
              'No se han podido cargar las etiquetas existentes'
            )}
            .
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0 text-xs"
            onClick={() => tagsQuery.refetch()}
          >
            Reintentar
          </Button>
        </div>
      ) : tagsQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando etiquetas existentes...</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Solo se usan en admin para identificar dietas por cliente, objetivo o etapa.
        </p>
      )}

      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}
