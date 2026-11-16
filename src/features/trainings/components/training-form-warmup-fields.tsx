import type { RefObject } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { TrainingFormValues } from '../schemas'

interface TrainingFormWarmupFieldsProps {
  form: UseFormReturn<TrainingFormValues>
  sectionRef: RefObject<HTMLDivElement | null>
}

export function TrainingFormWarmupFields({ form, sectionRef }: TrainingFormWarmupFieldsProps) {
  return (
    <div ref={sectionRef} className="min-w-0 space-y-4">
      <p className="font-display text-xl font-extrabold uppercase leading-none text-foreground">Calentamiento y vuelta a la calma</p>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
        <FormField
          control={form.control}
          name="warmup_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción calentamiento</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={2}
                  placeholder="Describe el calentamiento..."
                  className="flex w-full resize-none rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="warmup_duration_min"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duración (min)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  placeholder="10"
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
        name="cooldown_description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción vuelta a la calma</FormLabel>
            <FormControl>
              <textarea
                {...field}
                rows={2}
                placeholder="Describe la vuelta a la calma..."
                className="flex w-full resize-none rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
