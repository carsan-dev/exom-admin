import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Check, ChevronsUpDown, SendHorizonal, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { isApprovalPendingError } from '@/lib/api-utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useNotificationTemplates } from '@/features/notification-templates/api'
import type { NotificationTemplate } from '@/features/notification-templates/types'
import { useClients } from '../../clients/api'
import { getUserDisplayName, type Client } from '../../clients/types'
import {
  getApiErrorMessage,
  useSendNotification,
  useSendToAllClients,
} from '../api'
import {
  isNotificationSendSummary,
  NOTIFICATION_ROUTE_OPTIONS,
  NOTIFICATION_ROUTE_VALUES,
  type NotificationRouteType,
} from '../types'

const ALL_CLIENTS_LIMIT = 200

const sendNotificationSchema = z
  .object({
    sendToAll: z.boolean(),
    user_ids: z.array(z.string().uuid('Selecciona destinatarios validos')),
    title: z
      .string()
      .trim()
      .min(1, 'El título es obligatorio')
      .max(100, 'El título no puede superar los 100 caracteres'),
    body: z
      .string()
      .trim()
      .min(1, 'El cuerpo es obligatorio')
      .max(500, 'El cuerpo no puede superar los 500 caracteres'),
    type: z.enum(NOTIFICATION_ROUTE_VALUES),
  })
  .superRefine((values, ctx) => {
    if (!values.sendToAll && values.user_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['user_ids'],
        message: 'Selecciona al menos un destinatario',
      })
    }
  })

type SendNotificationFormValues = z.infer<typeof sendNotificationSchema>

const defaultValues: SendNotificationFormValues = {
  sendToAll: false,
  user_ids: [],
  title: '',
  body: '',
  type: 'home',
}

const QUICK_TEMPLATES: ReadonlyArray<{
  label: string
  title: string
  body: string
  type: NotificationRouteType
}> = [
  {
    label: 'Recordatorio recap',
    title: 'No olvides completar tu recap semanal',
    body: 'Entra en EXOM y completa tu recap para que podamos revisar tu semana contigo.',
    type: 'recap',
  },
  {
    label: 'Recordatorio entreno',
    title: 'Tienes un entreno pendiente',
    body: 'Recuerda revisar tu planificación y completar tu entrenamiento de hoy en la app.',
    type: 'training',
  },
  {
    label: 'Recordatorio dieta',
    title: 'Revisa tu planificación nutricional',
    body: 'Abre EXOM para consultar tu dieta y mantener el plan al día.',
    type: 'diet',
  },
]

function getRouteTypeFromTemplate(route: string | null | undefined): NotificationRouteType {
  if (!route) {
    return 'home'
  }

  if (route.startsWith('/recap')) {
    return 'recap'
  }

  if (route.startsWith('/trainings')) {
    return 'training'
  }

  if (route.startsWith('/diets')) {
    return 'diet'
  }

  if (route.startsWith('/challenges')) {
    return 'challenge'
  }

  if (route.startsWith('/calendar')) {
    return 'calendar'
  }

  if (route.startsWith('/profile')) {
    return 'profile'
  }

  return 'home'
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((value) => value[0])
    .join('')
    .toUpperCase()
}

interface RecipientsMultiSelectProps {
  clients: Client[]
  selectedIds: string[]
  disabled?: boolean
  isLoading?: boolean
  onChange: (ids: string[]) => void
}

function RecipientsMultiSelect({
  clients,
  selectedIds,
  disabled,
  isLoading,
  onChange,
}: RecipientsMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedClients = useMemo(
    () => clients.filter((client) => selectedIds.includes(client.id)),
    [clients, selectedIds],
  )

  const label =
    selectedClients.length === 0
      ? 'Seleccionar destinatarios...'
      : selectedClients.length === 1
        ? getUserDisplayName(selectedClients[0])
        : `${selectedClients.length} clientes seleccionados`

  const toggleClient = (clientId: string) => {
    if (selectedIds.includes(clientId)) {
      onChange(selectedIds.filter((value) => value !== clientId))
      return
    }

    onChange([...selectedIds, clientId])
  }

  const removeClient = (clientId: string) => {
    onChange(selectedIds.filter((value) => value !== clientId))
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate text-left">{label}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[360px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar por nombre o email..." />
            <CommandList>
              {isLoading ? <CommandEmpty>Cargando clientes...</CommandEmpty> : null}
              {!isLoading && clients.length === 0 ? <CommandEmpty>Sin clientes disponibles.</CommandEmpty> : null}
              <CommandGroup>
                {clients.map((client) => {
                  const displayName = getUserDisplayName(client)
                  const isSelected = selectedIds.includes(client.id)

                  return (
                    <CommandItem
                      key={client.id}
                      value={`${displayName} ${client.email}`}
                      onSelect={() => toggleClient(client.id)}
                    >
                      <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                      <Avatar className="mr-2 h-6 w-6">
                        <AvatarImage src={client.profile?.avatar_url ?? undefined} alt={displayName} />
                        <AvatarFallback className="text-[10px]">{getInitials(displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedClients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedClients.map((client) => {
            const displayName = getUserDisplayName(client)

            return (
              <Badge
                key={client.id}
                variant="outline"
                className="gap-1 border-brand-primary/20 bg-brand-soft/10 pr-1 text-brand-primary"
              >
                <span className="max-w-[180px] truncate">{displayName}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-brand-soft/20"
                  onClick={() => removeClient(client.id)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface SendNotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendNotificationDialog({ open, onOpenChange }: SendNotificationDialogProps) {
  const sendNotification = useSendNotification()
  const sendToAllClients = useSendToAllClients()
  const clientsQuery = useClients(1, ALL_CLIENTS_LIMIT)
  const templatesQuery = useNotificationTemplates(open)

  const form = useForm<SendNotificationFormValues>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues,
  })

  const sendToAll = form.watch('sendToAll')
  const clients = clientsQuery.data?.data ?? []
  const isSubmitting = sendNotification.isPending || sendToAllClients.isPending
  const clientsLoadError = clientsQuery.isError
    ? getApiErrorMessage(clientsQuery.error, 'No se ha podido cargar la cartera de clientes')
    : null
  const isClientsUnavailable = clientsQuery.isLoading || clientsQuery.isError
  const manualTemplates = useMemo(
    () =>
      (templatesQuery.data ?? []).filter(
        (template) => !template.is_system && template.enabled && template.variables.length === 0,
      ),
    [templatesQuery.data],
  )

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
    }
  }, [form, open])

  useEffect(() => {
    if (clientsQuery.isError && sendToAll) {
      form.setValue('sendToAll', false)
    }
  }, [clientsQuery.isError, form, sendToAll])

  const applyTemplate = (template: {
    title: string
    body: string
    type?: NotificationRouteType
    route?: string | null
  }) => {
    form.setValue('title', template.title, { shouldValidate: true })
    form.setValue('body', template.body, { shouldValidate: true })
    form.setValue('type', template.type ?? getRouteTypeFromTemplate(template.route), { shouldValidate: true })
  }

  const applyManualTemplate = (template: NotificationTemplate) => {
    applyTemplate({
      title: template.title,
      body: template.body,
      route: template.route,
    })
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = {
      title: values.title.trim(),
      body: values.body.trim(),
      data: { type: values.type },
    }

    try {
      const result = values.sendToAll
        ? await sendToAllClients.mutateAsync(payload)
        : await sendNotification.mutateAsync({
            ...payload,
            ...(values.user_ids.length === 1
              ? { user_id: values.user_ids[0] }
              : { user_ids: values.user_ids }),
          })

      if (isNotificationSendSummary(result)) {
        if (result.failed > 0) {
          toast.error(`Se enviaron ${result.sent} y fallaron ${result.failed}. Revisa el historial para ver el detalle.`)
        } else {
          toast.success(
            result.sent === 1
              ? 'Notificación enviada correctamente'
              : `Notificaciones enviadas a ${result.sent} clientes`,
          )
        }
      } else if (result.status === 'FAILED') {
        toast.error(result.error ?? 'La notificación no se pudo entregar. Revisa el historial para ver el detalle.')
      } else {
        toast.success('Notificación enviada correctamente')
      }

      onOpenChange(false)
    } catch (error) {
      if (isApprovalPendingError(error)) {
        onOpenChange(false)
        return
      }

      toast.error(getApiErrorMessage(error, 'No se ha podido enviar la notificación'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar notificación</DialogTitle>
          <DialogDescription>
            Envía un mensaje puntual a uno o varios clientes, o a toda tu cartera visible desde el panel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">Plantillas rápidas</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_TEMPLATES.map((template) => (
              <Button
                key={template.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyTemplate(template)}
              >
                {template.label}
              </Button>
            ))}
          </div>
          {manualTemplates.length > 0 ? (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Guardadas</p>
              <div className="flex flex-wrap gap-2">
                {manualTemplates.map((template) => (
                  <Button
                    key={template.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyManualTemplate(template)}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {clientsLoadError ? (
          <div className="flex items-start gap-3 rounded-xl border border-status-error/30 bg-status-error/5 p-4 text-sm text-status-error">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">No se pudo cargar la cartera de clientes</p>
              <p>{clientsLoadError}</p>
            </div>
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="sendToAll"
              render={({ field }) => (
                <FormItem className="rounded-xl border border-border/70 p-4">
                  <div className="flex items-start gap-3">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        disabled={isClientsUnavailable || isSubmitting}
                        className="mt-1 h-4 w-4 rounded border-input"
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel>Enviar a todos mis clientes</FormLabel>
                      <FormDescription>
                        {clientsLoadError
                          ? 'Corrige el problema de carga antes de enviar notificaciones.'
                          : clients.length > 0
                          ? `Se enviará a ${clients.length} cliente${clients.length === 1 ? '' : 's'} visibles.`
                          : 'Ahora mismo no hay clientes visibles en tu cartera.'}
                      </FormDescription>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="user_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destinatarios</FormLabel>
                  <FormControl>
                    <RecipientsMultiSelect
                      clients={clients}
                      selectedIds={field.value}
                      onChange={field.onChange}
                      disabled={sendToAll || isClientsUnavailable}
                      isLoading={clientsQuery.isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    {clientsLoadError
                      ? 'La selección de destinatarios queda bloqueada hasta recuperar la cartera de clientes.'
                      : sendToAll
                      ? 'La selección manual queda desactivada mientras envías a toda tu cartera.'
                      : 'Puedes elegir uno o varios clientes concretos.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Nuevo recordatorio"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo / ruta</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un destino" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NOTIFICATION_ROUTE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuerpo</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={4}
                      placeholder="Escribe el mensaje que recibirán tus clientes..."
                      className="flex w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || isClientsUnavailable}>
                <SendHorizonal className="h-4 w-4" />
                {isSubmitting ? 'Enviando...' : 'Enviar notificación'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
