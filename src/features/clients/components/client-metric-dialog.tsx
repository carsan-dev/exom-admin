import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import {
  getApiErrorMessage,
  useCreateClientMetric,
  useUpdateClientMetric,
} from '../api'
import { clientMetricSchema, type ClientMetricFormValues } from '../schemas'
import type { BodyMetric } from '../types'

type MetricValueField = Exclude<keyof ClientMetricFormValues, 'date'>

const METRIC_SECTIONS: Array<{
  title: string
  fields: Array<{ name: MetricValueField; label: string; unit: string; step?: string }>
}> = [
  {
    title: 'Composición y bienestar',
    fields: [
      { name: 'weight_kg', label: 'Peso', unit: 'kg', step: '0.1' },
      { name: 'muscle_mass_kg', label: 'Masa muscular', unit: 'kg', step: '0.1' },
      { name: 'height_cm', label: 'Altura', unit: 'cm', step: '0.1' },
      { name: 'sleep_hours', label: 'Sueño', unit: 'h', step: '0.1' },
    ],
  },
  {
    title: 'Tronco',
    fields: [
      { name: 'neck_cm', label: 'Cuello', unit: 'cm' },
      { name: 'shoulders_cm', label: 'Hombros', unit: 'cm' },
      { name: 'chest_cm', label: 'Pecho', unit: 'cm' },
      { name: 'waist_cm', label: 'Cintura', unit: 'cm' },
      { name: 'hips_cm', label: 'Cadera', unit: 'cm' },
    ],
  },
  {
    title: 'Extremidades',
    fields: [
      { name: 'arm_left_cm', label: 'Brazo izquierdo', unit: 'cm' },
      { name: 'arm_right_cm', label: 'Brazo derecho', unit: 'cm' },
      { name: 'forearm_left_cm', label: 'Antebrazo izquierdo', unit: 'cm' },
      { name: 'forearm_right_cm', label: 'Antebrazo derecho', unit: 'cm' },
      { name: 'thigh_left_cm', label: 'Muslo izquierdo', unit: 'cm' },
      { name: 'thigh_right_cm', label: 'Muslo derecho', unit: 'cm' },
      { name: 'calf_left_cm', label: 'Gemelo izquierdo', unit: 'cm' },
      { name: 'calf_right_cm', label: 'Gemelo derecho', unit: 'cm' },
    ],
  },
]

const METRIC_FIELDS = METRIC_SECTIONS.flatMap((section) => section.fields.map((field) => field.name))

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getDefaultValues(metric: BodyMetric | null): ClientMetricFormValues {
  const values = Object.fromEntries(
    METRIC_FIELDS.map((field) => [field, metric?.[field]?.toString() ?? '']),
  ) as Record<MetricValueField, string>

  return {
    date: metric?.date.slice(0, 10) ?? getToday(),
    ...values,
  }
}

interface ClientMetricDialogProps {
  clientId: string
  metric: BodyMetric | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientMetricDialog({ clientId, metric, open, onOpenChange }: ClientMetricDialogProps) {
  const createMetric = useCreateClientMetric()
  const updateMetric = useUpdateClientMetric()
  const isEditing = metric != null
  const isPending = createMetric.isPending || updateMetric.isPending
  const form = useForm<ClientMetricFormValues>({
    resolver: zodResolver(clientMetricSchema),
    defaultValues: getDefaultValues(metric),
  })

  useUnsavedChanges('client-metric-form', open && (form.formState.isDirty || isPending))

  useEffect(() => {
    if (open) form.reset(getDefaultValues(metric))
  }, [form, metric, open])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (metric) {
        await updateMetric.mutateAsync({ clientId, metricId: metric.id, values })
      } else {
        await createMetric.mutateAsync({ clientId, values })
      }
      form.reset(values)
      toast.success(metric ? 'Métricas actualizadas' : 'Métricas añadidas')
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se han podido guardar las métricas'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableOutsideClose className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar métricas' : 'Añadir métricas'}</DialogTitle>
          <DialogDescription>
            Registra medidas del cliente. Campos sin valor quedarán vacíos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Fecha (UTC)</FormLabel>
                  <FormControl>
                    <Input type="date" max={getToday()} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {METRIC_SECTIONS.map((section) => (
              <section key={section.title} className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.fields.map((metricField) => (
                    <FormField
                      key={metricField.name}
                      control={form.control}
                      name={metricField.name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{metricField.label} ({metricField.unit})</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step={metricField.step ?? '0.1'}
                              inputMode="decimal"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </section>
            ))}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Añadir métricas'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
