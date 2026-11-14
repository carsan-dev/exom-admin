import { useEffect, useRef, useState } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { clearUnsavedChanges, useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { getApiErrorCode, getApiErrorMessages, isNotConfiguredError, useCreateSubscriber, useUpdateSubscriber } from '../api'
import { buildUpdatePayload } from '../build-update-payload'
import { getGoalLabel, NOT_CONFIGURED_HELP, NOT_CONFIGURED_TITLE } from '../labels'
import { subscriberFormSchema, type SubscriberFormValues } from '../schemas'
import type { BaseRoute, BaseSubscriber } from '../types'

const FORM_ID = 'base-service-subscriber-form'

const DAYS_CHANGE_NOTE =
  'El cambio se aplica a partir del próximo mes que envíes. Los meses ya enviados se reenvían con los días que tenían.'

const emptyValues: SubscriberFormValues = { name: '', email: '', goal: '', days_per_week: '', notes: '' }

function toFormValues(subscriber: BaseSubscriber | null): SubscriberFormValues {
  if (!subscriber) return emptyValues
  return {
    name: subscriber.name,
    email: subscriber.email,
    goal: subscriber.goal,
    days_per_week: String(subscriber.days_per_week),
    notes: subscriber.notes ?? '',
  }
}

interface SubscriberFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Subscriber being edited; null creates a new one. */
  subscriber: BaseSubscriber | null
  routes: BaseRoute[] | undefined
  routesError: boolean
}

export function SubscriberFormDialog({ open, onOpenChange, subscriber, routes, routesError }: SubscriberFormDialogProps) {
  const createSubscriber = useCreateSubscriber()
  const updateSubscriber = useUpdateSubscriber()
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const inFlight = useRef(false)
  const isEdit = subscriber !== null
  const isPending = createSubscriber.isPending || updateSubscriber.isPending

  const form = useForm<SubscriberFormValues>({
    resolver: zodResolver(subscriberFormSchema),
    defaultValues: toFormValues(subscriber),
  })
  useUnsavedChanges(FORM_ID, open && (form.formState.isDirty || isPending))

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(subscriber))
      setServerErrors([])
    }
  }, [form, open, subscriber])

  const goal = form.watch('goal')
  const route = routes?.find((item) => item.objetivo === goal)
  const dayOptions = route
    ? route.dias
    : subscriber && subscriber.goal === goal
      ? [subscriber.days_per_week]
      : []
  const watchedDays = form.watch('days_per_week')
  const hasDeliveries = subscriber !== null && (subscriber.latest_delivery !== null || subscriber.last_sent_month !== null)
  const daysChangeNote =
    subscriber && hasDeliveries && watchedDays !== '' && Number(watchedDays) !== subscriber.days_per_week
      ? DAYS_CHANGE_NOTE
      : null
  const goalKeys = routes ? routes.map((item) => item.objetivo) : []
  if (goal && !goalKeys.includes(goal)) goalKeys.push(goal)

  const close = (value: boolean) => {
    if (isPending) return
    onOpenChange(value)
  }

  const finish = () => {
    clearUnsavedChanges(FORM_ID)
    onOpenChange(false)
  }

  const submit = form.handleSubmit(async (values) => {
    if (inFlight.current) return
    inFlight.current = true
    setServerErrors([])
    try {
      if (subscriber) {
        const payload = buildUpdatePayload(subscriber, values)
        if (Object.keys(payload).length === 0) {
          toast.info('No hay cambios que guardar')
          finish()
          return
        }
        await updateSubscriber.mutateAsync({ id: subscriber.id, payload })
        toast.success('Suscriptor actualizado')
      } else {
        const notes = values.notes.trim()
        await createSubscriber.mutateAsync({
          name: values.name.trim(),
          email: values.email.trim(),
          goal: values.goal,
          days_per_week: Number(values.days_per_week),
          ...(notes ? { notes } : {}),
        })
        toast.success('Suscriptor creado')
      }
      finish()
    } catch (error) {
      if (getApiErrorCode(error) === 'NO_CHANGES') {
        toast.info('No hay cambios que guardar')
        finish()
        return
      }
      setServerErrors(
        isNotConfiguredError(error)
          ? [`${NOT_CONFIGURED_TITLE} ${NOT_CONFIGURED_HELP}`]
          : getApiErrorMessages(error, 'No se ha podido guardar el suscriptor'),
      )
    } finally {
      inFlight.current = false
    }
  })

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent disableOutsideClose className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar suscriptor' : 'Nuevo suscriptor'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Los cambios se aplican a los próximos envíos; los ya enviados no cambian.'
              : 'Registra a una persona del servicio base para poder enviarle cada mes su material en PDF.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            {subscriber && (
              <p className="text-sm text-muted-foreground">
                Pedido: <span className="font-mono text-foreground">{subscriber.order_code}</span>
              </p>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {routesError && (
              <p role="alert" className="text-sm text-destructive">
                No se ha podido cargar el catálogo de objetivos y días. Cierra el diálogo e inténtalo de nuevo.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo</FormLabel>
                    <Select
                      value={field.value}
                      disabled={!routes && !subscriber}
                      onValueChange={(value) => {
                        field.onChange(value)
                        const next = routes?.find((item) => item.objetivo === value)
                        const current = Number(form.getValues('days_per_week'))
                        if (!next || !next.dias.includes(current)) {
                          form.setValue('days_per_week', '', { shouldDirty: true })
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un objetivo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {goalKeys.map((key) => (
                          <SelectItem key={key} value={key}>
                            {getGoalLabel(key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="days_per_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de entrenamiento por semana</FormLabel>
                    <Select value={field.value} disabled={!goal} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={goal ? 'Selecciona los días' : 'Elige antes un objetivo'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dayOptions.map((days) => (
                          <SelectItem key={days} value={String(days)}>
                            {days} {days === 1 ? 'día' : 'días'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {daysChangeNote && (
                      <p role="note" className="text-xs text-muted-foreground">
                        {daysChangeNote}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={3}
                      placeholder="Por ejemplo, cómo ha pagado"
                      className="flex w-full resize-none rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverErrors.length > 0 && (
              <div role="alert" className="space-y-1 text-sm text-destructive">
                {serverErrors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => close(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear suscriptor'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
