import type { RefObject } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LEVEL_LABELS, LEVEL_OPTIONS } from '../../exercises/types'
import type { TrainingFormValues } from '../schemas'
import { AccentColorField } from './training-accent-color-field'
import { TagsField } from './training-tags-field'
import { TrainingTypesField } from './training-types-field'

interface TrainingFormGeneralFieldsProps {
  form: UseFormReturn<TrainingFormValues>
  sectionRef: RefObject<HTMLDivElement | null>
  colorInputInstanceKey: number
}

export function TrainingFormGeneralFields({
  form,
  sectionRef,
  colorInputInstanceKey,
}: TrainingFormGeneralFieldsProps) {
  return (
    <div ref={sectionRef} className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Información general
      </p>

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre</FormLabel>
            <FormControl>
              <Input placeholder="Ej. Full Body Fuerza + Cardio" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <FormField
          control={form.control}
          name="types"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Tipos</FormLabel>
              <FormControl>
                <TrainingTypesField
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nivel</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LEVEL_OPTIONS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {LEVEL_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="accentColor"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Color visual</FormLabel>
            <FormControl>
              <AccentColorField
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                inputInstanceKey={colorInputInstanceKey}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="estimated_duration_min"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duración estimada (min)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  placeholder="45"
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value === '' ? null : parseInt(event.target.value, 10)
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="estimated_calories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Calorías estimadas (kcal)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  placeholder="300"
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(
                      event.target.value === '' ? null : parseInt(event.target.value, 10)
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="tags"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Etiquetas</FormLabel>
            <FormControl>
              <TagsField
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  )
}
