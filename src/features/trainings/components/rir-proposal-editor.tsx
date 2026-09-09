import { useWatch, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { RirOverrideEditor, RirSequenceEditor } from './rir-editor'
import type { TrainingFormValues } from '../schemas'
import type { Exercise } from '../../exercises/types'
import { useExercisesList } from '../api'

export function RirProposalEditor({ form }: { form: UseFormReturn<TrainingFormValues> }) {
  const exercises: Exercise[] = useExercisesList().data?.data ?? []
  const sequence = useWatch({ control: form.control, name: 'rir_proposal' })
  const items = useWatch({ control: form.control, name: 'items' })
  return (
    <section className="space-y-4 rounded-xl border border-border p-5">
      <div>
        <h3 className="font-semibold">Propuesta de mesociclo de RIR</h3>
        <p className="text-sm text-muted-foreground">
          Plantilla opcional para cargar al asignar a un cliente. Editarla conserva los ciclos ya
          activados y el RIR fijo de los ejercicios.
        </p>
      </div>
      {sequence ? (
        <>
          <RirSequenceEditor
            value={sequence}
            onChange={(v) => form.setValue('rir_proposal', v, { shouldDirty: true })}
          />
          {items.map((item, i) => (
            <div key={i}>
              {item.kind === 'CIRCUIT' && <h4 className="text-sm font-medium">{item.name}</h4>}
              {(item.kind === 'CIRCUIT' ? item.exercises : [item]).map((ex, j) => (
                <RirOverrideEditor
                  key={j}
                  label={`${i + 1}${item.kind === 'CIRCUIT' ? `.${j + 1}` : ''} · ${exercises.find((e) => e.id === ex.exercise_id)?.name ?? 'Ejercicio'}`}
                  sequence={sequence}
                  value={ex.rir_override}
                  onChange={(v) =>
                    form.setValue(
                      item.kind === 'CIRCUIT'
                        ? `items.${i}.exercises.${j}.rir_override`
                        : `items.${i}.rir_override`,
                      v,
                      { shouldDirty: true }
                    )
                  }
                />
              ))}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => form.setValue('rir_proposal', null, { shouldDirty: true })}
          >
            Quitar propuesta
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => form.setValue('rir_proposal', [3, 2, 1, 0], { shouldDirty: true })}
        >
          Añadir propuesta
        </Button>
      )}
      {form.formState.errors.rir_proposal && (
        <p role="alert" className="text-sm text-destructive">
          Revisa los RIR y la duración de las excepciones.
        </p>
      )}
    </section>
  )
}
