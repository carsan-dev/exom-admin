import type { RefObject } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { FormControl, FormField, FormItem } from '@/components/ui/form'
import type { TrainingFormValues } from '../schemas'
import { ExercisePicker } from './exercise-picker'
import { getFirstErrorMessage } from './training-form-errors'

interface TrainingFormExercisesSectionProps {
  form: UseFormReturn<TrainingFormValues>
  sectionRef: RefObject<HTMLDivElement | null>
}

export function TrainingFormExercisesSection({
  form,
  sectionRef,
}: TrainingFormExercisesSectionProps) {
  return (
    <div ref={sectionRef} className="min-w-0">
      <FormField
        control={form.control}
        name="items"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <ExercisePicker
                value={field.value}
                onChange={field.onChange}
                error={getFirstErrorMessage(form.formState.errors.items)}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  )
}
