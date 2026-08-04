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
import {
  Form,
  FormControl,
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
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { getApiErrorMessage, useUpdateClientProfile } from '../api'
import { updateClientProfileSchema, type UpdateClientProfileFormValues } from '../schemas'
import { LEVEL_LABELS, LEVEL_OPTIONS, type ClientProfile } from '../types'

interface EditClientProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  profile: ClientProfile | null
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

function getDefaultValues(profile: ClientProfile | null): UpdateClientProfileFormValues {
  return {
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    level: profile?.level ?? 'PRINCIPIANTE',
    main_goal: profile?.main_goal ?? '',
    muscle_mass_goal: profile?.muscle_mass_goal?.toString() ?? '',
    target_calories: profile?.target_calories?.toString() ?? '',
    current_weight: profile?.current_weight?.toString() ?? '',
    height: profile?.height?.toString() ?? '',
    birth_date: toDateInput(profile?.birth_date ?? null),
  }
}

export function EditClientProfileDialog({
  open,
  onOpenChange,
  clientId,
  profile,
}: EditClientProfileDialogProps) {
  const updateProfile = useUpdateClientProfile()
  const form = useForm<UpdateClientProfileFormValues>({
    resolver: zodResolver(updateClientProfileSchema),
    defaultValues: getDefaultValues(profile),
  })
  useUnsavedChanges(
    'edit-client-profile-form',
    open && (form.formState.isDirty || updateProfile.isPending)
  )

  useEffect(() => {
    if (open) form.reset(getDefaultValues(profile))
  }, [form, open, profile])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync({ clientId, values })
      toast.success('Datos del cliente actualizados')
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se han podido actualizar los datos del cliente'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableOutsideClose className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar datos del cliente</DialogTitle>
          <DialogDescription>Actualiza información personal, nivel y objetivos.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nivel</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de nacimiento</FormLabel>
                    <FormControl>
                      <Input type="date" max={new Date().toISOString().slice(0, 10)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="main_goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivo principal</FormLabel>
                  <FormControl>
                    <Input placeholder="Perder grasa, ganar fuerza..." maxLength={160} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="current_weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso actual (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="500" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altura (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="300" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_calories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calorías objetivo (kcal)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="20000" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="muscle_mass_goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo masa muscular (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="500" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
