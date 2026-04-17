import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { isApprovalPendingError } from '@/lib/api-utils'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getApiErrorMessage, useCreateChallenge, useUpdateChallenge } from '../api'
import { challengeFormSchema, getTodayDateInputValue } from '../schemas'
import {
  buildChallengeFormDefaults,
  CHALLENGE_RULE_METADATA,
  CHALLENGE_RULE_OPTIONS,
  CHALLENGE_TYPE_LABELS,
  CHALLENGE_TYPE_OPTIONS,
  type ChallengeFormValues,
  type ChallengeListItem,
  type ChallengeRuleKey,
} from '../types'

interface ChallengeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  challenge?: ChallengeListItem | null
  onSubmitted?: () => void
}

export function ChallengeFormDialog({ open, onOpenChange, challenge, onSubmitted }: ChallengeFormDialogProps) {
  const createChallenge = useCreateChallenge()
  const updateChallenge = useUpdateChallenge()
  const isEditing = Boolean(challenge)

  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeFormSchema),
    defaultValues: buildChallengeFormDefaults(challenge ?? undefined),
  })

  const isManual = form.watch('is_manual')
  const selectedRuleKey = form.watch('rule_key')
  const selectedRule = selectedRuleKey ? CHALLENGE_RULE_METADATA[selectedRuleKey] : null
  const isPending = createChallenge.isPending || updateChallenge.isPending
  const todayDateInputValue = getTodayDateInputValue()

  useEffect(() => {
    if (open) {
      form.reset(buildChallengeFormDefaults(challenge ?? undefined))
      return
    }

    form.reset(buildChallengeFormDefaults())
  }, [challenge, form, open])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (challenge) {
        await updateChallenge.mutateAsync({ id: challenge.id, values })
        toast.success('Reto actualizado correctamente')
      } else {
        await createChallenge.mutateAsync(values)
        toast.success('Reto creado correctamente')
      }

      onSubmitted?.()
      onOpenChange(false)
    } catch (error) {
      if (isApprovalPendingError(error)) {
        onOpenChange(false)
        return
      }

      toast.error(
        getApiErrorMessage(
          error,
          isEditing ? 'No se ha podido actualizar el reto' : 'No se ha podido crear el reto',
        ),
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar reto' : 'Nuevo reto'}</DialogTitle>
          <DialogDescription>
            Configura un objetivo principal o un reto semanal, manual o automático, y decide si debe quedar disponible por cliente o globalmente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Completa 4 entrenos esta semana" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={3}
                      placeholder="Explica cómo se completa el reto y qué verá el cliente en la app."
                      className="flex w-full resize-none rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHALLENGE_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type} value={type}>
                            {CHALLENGE_TYPE_LABELS[type]}
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
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha límite</FormLabel>
                    <FormControl>
                      <Input type="date" min={todayDateInputValue} {...field} />
                    </FormControl>
                    <FormDescription>Déjala vacía para que el reto no tenga fecha límite.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="is_manual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modo de progreso</FormLabel>
                    <Select
                      value={field.value ? 'MANUAL' : 'AUTOMATIC'}
                      onValueChange={(value) => {
                        const nextIsManual = value === 'MANUAL'
                        field.onChange(nextIsManual)

                        if (nextIsManual) {
                          form.setValue('rule_key', null, { shouldValidate: true, shouldDirty: true })
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MANUAL">Manual</SelectItem>
                        <SelectItem value="AUTOMATIC">Automático</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_global"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alcance</FormLabel>
                    <Select
                      value={field.value ? 'GLOBAL' : 'CLIENT'}
                      onValueChange={(value) => field.onChange(value === 'GLOBAL')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CLIENT">Por cliente</SelectItem>
                        <SelectItem value="GLOBAL">Global</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <FormField
                control={form.control}
                name="target_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad</FormLabel>
                    <FormControl>
                      <Input placeholder="días, comidas, registros..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isManual && (
              <FormField
                control={form.control}
                name="rule_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regla automática</FormLabel>
                    <Select
                      value={field.value ?? '__none__'}
                      onValueChange={(value) => {
                        const nextRuleKey = value === '__none__' ? null : (value as ChallengeRuleKey)
                        field.onChange(nextRuleKey)

                        if (nextRuleKey) {
                          form.setValue('unit', CHALLENGE_RULE_METADATA[nextRuleKey].defaultUnit, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una regla" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Selecciona una regla</SelectItem>
                        {CHALLENGE_RULE_OPTIONS.map((ruleKey) => (
                          <SelectItem key={ruleKey} value={ruleKey}>
                            {CHALLENGE_RULE_METADATA[ruleKey].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!isManual && selectedRule && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <p className="text-sm font-medium text-foreground">{selectedRule.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedRule.description}</p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (isEditing ? 'Guardando...' : 'Creando...') : isEditing ? 'Guardar cambios' : 'Crear reto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
