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
import { getApiErrorMessage, useUpdateClientProfile } from '../api'
import { updateClientProfileSchema, type UpdateClientProfileFormValues } from '../schemas'

interface EditMainGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  currentMainGoal: string | null
}

export function EditMainGoalDialog({
  open,
  onOpenChange,
  clientId,
  currentMainGoal,
}: EditMainGoalDialogProps) {
  const updateProfile = useUpdateClientProfile()
  const form = useForm<UpdateClientProfileFormValues>({
    resolver: zodResolver(updateClientProfileSchema),
    defaultValues: { main_goal: currentMainGoal ?? '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({ main_goal: currentMainGoal ?? '' })
    }
  }, [form, open, currentMainGoal])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync({ clientId, values })
      toast.success('Objetivo principal actualizado')
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido actualizar el objetivo'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar objetivo principal</DialogTitle>
          <DialogDescription>
            Define el foco y motivación actual del cliente. Máximo 160 caracteres.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="main_goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivo principal</FormLabel>
                  <FormControl>
                    <Input placeholder="Perder grasa, ganar masa muscular..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
