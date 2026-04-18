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
import { getApiErrorMessage, useCreateAdmin } from '../api'
import { createAdminSchema, type CreateAdminFormValues } from '../schemas'

interface CreateAdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const defaultValues: CreateAdminFormValues = {
  email: '',
  send_invitation: true,
  password: '',
  first_name: '',
  last_name: '',
}

export function CreateAdminDialog({ open, onOpenChange }: CreateAdminDialogProps) {
  const createAdmin = useCreateAdmin()
  const form = useForm<CreateAdminFormValues>({
    resolver: zodResolver(createAdminSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
    }
  }, [form, open])

  const sendInvitation = form.watch('send_invitation')

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await createAdmin.mutateAsync(values)
      toast.success(
        values.send_invitation
          ? 'Admin creado. Email de invitación enviado.'
          : 'Admin creado correctamente',
      )
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido crear el admin'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo admin</DialogTitle>
          <DialogDescription>
            Crea una nueva cuenta de administrador con acceso al panel de gestión de EXOM.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Lucía" {...field} />
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
                      <Input placeholder="Martínez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@exom.app" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="send_invitation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de contraseña</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'invitation')}
                    value={field.value ? 'invitation' : 'manual'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="invitation">Enviar email de invitación</SelectItem>
                      <SelectItem value="manual">Establecer contraseña manual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {sendInvitation ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                El admin recibirá un email para fijar su propia contraseña.
              </div>
            ) : (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña temporal</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createAdmin.isPending}>
                {createAdmin.isPending ? 'Creando...' : 'Crear admin'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
