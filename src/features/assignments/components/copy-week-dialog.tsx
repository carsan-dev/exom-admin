import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
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
import { copyWeekSchema, type CopyWeekFormValues } from '../schemas'

interface CopyWeekDialogProps {
  open: boolean
  sourceWeekStart: string
  isSubmitting?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CopyWeekFormValues) => Promise<void> | void
}

export function CopyWeekDialog({
  open,
  sourceWeekStart,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: CopyWeekDialogProps) {
  const form = useForm<CopyWeekFormValues>({
    resolver: zodResolver(copyWeekSchema),
    defaultValues: {
      source_week_start: sourceWeekStart,
      target_week_start: sourceWeekStart,
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset({
        source_week_start: sourceWeekStart,
        target_week_start: sourceWeekStart,
      })
      return
    }

    form.reset({
      source_week_start: sourceWeekStart,
      target_week_start: sourceWeekStart,
    })
  }, [form, open, sourceWeekStart])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copiar semana</DialogTitle>
          <DialogDescription>
            Configura la semana destino y revisa la vista previa antes de sobrescribir su planificación. Usa lunes como fecha de referencia.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values)
            })}
          >
            <FormField
              control={form.control}
              name="source_week_start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Semana origen</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" disabled />
                  </FormControl>
                  <FormDescription>Se usa la semana visible actualmente.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_week_start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Semana destino</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormDescription>Selecciona el lunes de la semana donde quieres copiar la planificación.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Ver vista previa
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
