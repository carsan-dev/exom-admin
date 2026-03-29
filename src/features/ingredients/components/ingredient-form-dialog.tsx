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
import { getApiErrorMessage, useCreateIngredient, useUpdateIngredient } from '../api'
import { ingredientSchema, type IngredientFormValues } from '../schemas'
import type { Ingredient } from '../types'

interface IngredientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredient?: Ingredient | null
  onSaved?: () => void
}

const defaultValues: IngredientFormValues = {
  name: '',
  icon: '',
  calories_per_100g: 0,
  protein_per_100g: 0,
  carbs_per_100g: 0,
  fat_per_100g: 0,
}

function toFormValues(ingredient: Ingredient): IngredientFormValues {
  return {
    name: ingredient.name,
    icon: ingredient.icon ?? '',
    calories_per_100g: ingredient.calories_per_100g,
    protein_per_100g: ingredient.protein_per_100g,
    carbs_per_100g: ingredient.carbs_per_100g,
    fat_per_100g: ingredient.fat_per_100g,
  }
}

export function IngredientFormDialog({ open, onOpenChange, ingredient, onSaved }: IngredientFormDialogProps) {
  const isEditing = Boolean(ingredient)
  const createIngredient = useCreateIngredient()
  const updateIngredient = useUpdateIngredient()
  const isPending = createIngredient.isPending || updateIngredient.isPending

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
    } else if (ingredient) {
      form.reset(toFormValues(ingredient))
    }
  }, [form, ingredient, open])

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEditing && ingredient) {
        await updateIngredient.mutateAsync({ id: ingredient.id, values })
        toast.success('Ingrediente actualizado correctamente')
      } else {
        await createIngredient.mutateAsync(values)
        toast.success('Ingrediente creado correctamente')
      }

      onSaved?.()
      onOpenChange(false)
    } catch (error) {
      const action = isEditing ? 'actualizar' : 'crear'
      toast.error(getApiErrorMessage(error, `No se ha podido ${action} el ingrediente`))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar ingrediente' : 'Nuevo ingrediente'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza los datos nutricionales del ingrediente seleccionado.'
              : 'Rellena los campos para añadir un nuevo ingrediente al catálogo reutilizable.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Avena" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icono</FormLabel>
                    <FormControl>
                      <Input placeholder="🥑" maxLength={8} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="calories_per_100g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>kcal por 100 g</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="protein_per_100g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proteína por 100 g</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carbs_per_100g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carbohidratos por 100 g</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fat_per_100g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grasas por 100 g</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" inputMode="decimal" {...field} />
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
              <Button type="submit" disabled={isPending}>
                {isPending ? (isEditing ? 'Guardando...' : 'Creando...') : isEditing ? 'Guardar cambios' : 'Crear ingrediente'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
