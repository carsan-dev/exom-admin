import { useState } from 'react'
import { Check, LoaderCircle, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage, useTrainingTypeCatalogColors, useTrainingTypes } from '../api'
import {
  getCatalogColorMap,
  getTrainingTypeBadgeClass,
  getTrainingTypeCatalogStyle,
  getTrainingTypeKey,
  getTrainingTypeLabel,
  normalizeTrainingTypeLabel,
  normalizeTrainingTypes,
} from '../types'

interface TrainingTypesFieldProps {
  value: string[]
  onChange: (value: string[]) => void
  error?: string
}

export function TrainingTypesField({ value, onChange, error }: TrainingTypesFieldProps) {
  const [input, setInput] = useState('')
  const trainingTypesQuery = useTrainingTypes()
  const trainingTypeColorsQuery = useTrainingTypeCatalogColors()
  const trainingTypeColorMap = getCatalogColorMap(trainingTypeColorsQuery.data)
  const availableTypes = trainingTypesQuery.data ?? []
  const resolvedTypes = normalizeTrainingTypes([...value, ...availableTypes])

  const hasType = (type: string) => {
    const typeKey = getTrainingTypeKey(type)
    return value.some((currentType) => getTrainingTypeKey(currentType) === typeKey)
  }

  const add = (rawType = input) => {
    const normalizedType = normalizeTrainingTypeLabel(rawType)

    if (!normalizedType || hasType(normalizedType)) {
      setInput('')
      return
    }

    onChange(normalizeTrainingTypes([...value, normalizedType]))
    setInput('')
  }

  const remove = (type: string) => {
    const typeKey = getTrainingTypeKey(type)
    onChange(value.filter((currentType) => getTrainingTypeKey(currentType) !== typeKey))
  }

  const toggle = (type: string) => {
    const normalizedType = normalizeTrainingTypeLabel(type)

    if (!normalizedType) {
      return
    }

    if (hasType(normalizedType)) {
      remove(normalizedType)
      return
    }

    onChange(normalizeTrainingTypes([...value, normalizedType]))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 flex-wrap gap-1.5 rounded-md border border-input bg-input px-3 py-2">
        {value.length === 0 ? (
          <span className="self-center text-sm text-muted-foreground">Sin tipos</span>
        ) : (
          value.map((type) => (
            <Badge
              key={type}
              variant="outline"
              className={
                !getTrainingTypeCatalogStyle(type, trainingTypeColorMap)
                  ? getTrainingTypeBadgeClass(type)
                  : undefined
              }
              style={getTrainingTypeCatalogStyle(type, trainingTypeColorMap)}
            >
              {getTrainingTypeLabel(type)}
              <button
                type="button"
                onClick={() => remove(type)}
                aria-label={`Quitar ${getTrainingTypeLabel(type)}`}
                className="relative ml-1 rounded-full p-0.5 hover:bg-foreground/10 max-md:after:absolute max-md:after:content-[''] max-md:after:inset-x-[min(0px,calc(50%-22px))] max-md:after:inset-y-[min(0px,calc(50%-22px))]"
              >
                <X aria-hidden="true" className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nuevo tipo (Enter)"
          aria-label="Nuevo tipo de entrenamiento"
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-md:h-11"
          onClick={() => add()}
          disabled={!normalizeTrainingTypeLabel(input) || hasType(input)}
          aria-label="Añadir tipo"
        >
          <Plus aria-hidden="true" className="h-3 w-3" />
        </Button>
      </div>

      {trainingTypesQuery.isLoading ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="h-3 w-3 animate-spin" />
          Cargando tipos existentes...
        </div>
      ) : trainingTypesQuery.isError ? (
        <div className="flex items-center gap-2 text-xs text-status-error">
          <span>
            {getApiErrorMessage(
              trainingTypesQuery.error,
              'No se han podido cargar los tipos existentes'
            )}
            .
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0 text-xs"
            onClick={() => trainingTypesQuery.refetch()}
          >
            Reintentar
          </Button>
        </div>
      ) : resolvedTypes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Tipos guardados. Pulsa para activar o quitar varios.
          </p>
          <div className="flex flex-wrap gap-2 rounded-md border border-dashed border-border/70 bg-muted/20 p-2">
            {resolvedTypes.map((type) => {
              const isSelected = hasType(type)
              const catalogStyle = getTrainingTypeCatalogStyle(type, trainingTypeColorMap)

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggle(type)}
                  aria-pressed={isSelected}
                  className={`relative inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors max-md:after:absolute max-md:after:content-[''] max-md:after:inset-x-[min(0px,calc(50%-22px))] max-md:after:inset-y-[min(0px,calc(50%-22px))] ${
                    isSelected && !catalogStyle
                      ? getTrainingTypeBadgeClass(type)
                      : !isSelected
                        ? 'border-border bg-background text-muted-foreground hover:bg-muted'
                        : ''
                  }`}
                  style={isSelected ? catalogStyle : undefined}
                >
                  {isSelected && <Check aria-hidden="true" className="h-3 w-3" />}
                  {getTrainingTypeLabel(type)}
                </button>
              )
            })}
          </div>
        </div>
      ) : resolvedTypes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aun no hay tipos guardados. Puedes crear el primero.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Selecciona varios tipos existentes o crea nuevos.
        </p>
      )}

      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}
