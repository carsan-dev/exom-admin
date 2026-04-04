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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { getApiErrorMessage, useUpdateRole } from '../api'
import { updateRoleSchema, type UpdateRoleFormValues } from '../schemas'
import { getUserDisplayName, ROLE_LABELS, ROLE_OPTIONS, type Role } from '../types'

interface ChangeRoleTarget {
  id: string
  email: string
  role: Role
  profile: {
    first_name: string
    last_name: string
  } | null
}

interface ChangeRoleDialogProps {
  user: ChangeRoleTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangeRoleDialog({ user, open, onOpenChange }: ChangeRoleDialogProps) {
  const currentUserId = useAuth((state) => state.user?.id)
  const updateRole = useUpdateRole()
  const form = useForm<UpdateRoleFormValues>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      role: user?.role ?? 'CLIENT',
    },
  })

  const selectedRole = form.watch('role')
  const isOwnAccount = user?.id === currentUserId

  useEffect(() => {
    if (user) {
      form.reset({ role: user.role })
    }
  }, [form, user])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!user) {
      return
    }

    try {
      await updateRole.mutateAsync({ userId: user.id, role: values.role })
      toast.success('Rol actualizado correctamente')
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido actualizar el rol'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar rol</DialogTitle>
          <DialogDescription>
            {isOwnAccount
              ? 'No puedes cambiar tu propio rol desde esta pantalla.'
              : `Actualiza el rol de ${user ? getUserDisplayName(user) : 'este usuario'} según el nivel de acceso que necesite.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isOwnAccount}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateRole.isPending || !user || selectedRole === user.role || isOwnAccount}>
                {updateRole.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
