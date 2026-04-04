import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
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
import { getApiErrorMessage, useCreateAchievement, useUpdateAchievement } from '../api'
import { achievementFormSchema } from '../schemas'
import {
  buildAchievementFormDefaults,
  getAchievementCriteriaHelp,
  getAchievementGoalHelp,
  CRITERIA_TYPE_LABELS,
  CRITERIA_TYPE_OPTIONS,
  getAchievementModeLabel,
  type AchievementFormValues,
  type AchievementListItem,
  TRAINING_TYPE_LABELS,
  TRAINING_TYPE_OPTIONS,
} from '../types'

interface AchievementFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  achievement?: AchievementListItem | null
  onSubmitted?: () => void
}

export function AchievementFormDialog({ open, onOpenChange, achievement, onSubmitted }: AchievementFormDialogProps) {
  const createAchievement = useCreateAchievement()
  const updateAchievement = useUpdateAchievement()
  const isEditing = Boolean(achievement)

  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementFormSchema),
    defaultValues: buildAchievementFormDefaults(achievement ?? undefined),
  })
  const criteriaType = useWatch({ control: form.control, name: 'criteria_type' }) ?? CRITERIA_TYPE_OPTIONS[0]
  const ruleConfig = useWatch({ control: form.control, name: 'rule_config' })

  const isPending = createAchievement.isPending || updateAchievement.isPending

  useEffect(() => {
    if (open) {
      form.reset(buildAchievementFormDefaults(achievement ?? undefined))
      return
    }

    form.reset(buildAchievementFormDefaults())
  }, [achievement, form, open])

  useEffect(() => {
    if (criteriaType !== 'TRAINING_DAYS' && ruleConfig?.training_type) {
      form.setValue('rule_config.training_type', undefined, { shouldDirty: true, shouldValidate: true })
    }
  }, [criteriaType, form, ruleConfig?.training_type])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (achievement) {
        await updateAchievement.mutateAsync({ id: achievement.id, values })
        toast.success('Logro actualizado correctamente')
      } else {
        await createAchievement.mutateAsync(values)
        toast.success('Logro creado correctamente')
      }

      onSubmitted?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          isEditing ? 'No se ha podido actualizar el logro' : 'No se ha podido crear el logro',
        ),
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar logro' : 'Nuevo logro'}</DialogTitle>
          <DialogDescription>
            Define la regla del logro, su meta numérica y cuándo el desbloqueo depende de una otorgación manual.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Primer entreno completado" {...field} />
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
                      placeholder="Desbloquéate completando tu primer entreno en la plataforma."
                      className="flex w-full resize-none rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del icono (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <FormField
                control={form.control}
                name="criteria_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regla</FormLabel>
                    <FormDescription>
                      Define qué se mide para desbloquear el logro. `CUSTOM` queda reservado para otorgación manual y no reemplaza el objetivo principal del cliente.
                    </FormDescription>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CRITERIA_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type} value={type}>
                            {CRITERIA_TYPE_LABELS[type]}
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
                name="criteria_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta</FormLabel>
                    <FormDescription>
                      {getAchievementGoalHelp(criteriaType)}
                    </FormDescription>
                    <FormControl>
                      <Input type="number" min="1" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {criteriaType === 'TRAINING_DAYS' && (
              <FormField
                control={form.control}
                name="rule_config.training_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de entrenamiento (opcional)</FormLabel>
                    <FormDescription>
                      Si lo dejas vacío, el logro contará cualquier entrenamiento completado.
                    </FormDescription>
                    <Select
                      value={field.value ?? 'ANY'}
                      onValueChange={(value) => field.onChange(value === 'ANY' ? undefined : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Cualquier entrenamiento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ANY">Cualquier entrenamiento</SelectItem>
                        {TRAINING_TYPE_OPTIONS.map((trainingType) => (
                          <SelectItem key={trainingType} value={trainingType}>
                            {TRAINING_TYPE_LABELS[trainingType]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Vista previa de la regla</p>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Modo:</span> {getAchievementModeLabel(criteriaType)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Qué se mide:</span> {getAchievementCriteriaHelp(criteriaType, ruleConfig)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Meta:</span> {getAchievementGoalHelp(criteriaType)}
              </p>
              {criteriaType === 'CUSTOM' ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  `CUSTOM` no se autoevalúa. Este logro solo cambia con otorgación o revocación manual.
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Al guardar, el backend sincroniza históricamente este logro en todos los clientes afectados: otorga los desbloqueos faltantes y revoca los que ya no cumplen la regla.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (isEditing ? 'Guardando...' : 'Creando...') : isEditing ? 'Guardar cambios' : 'Crear logro'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
