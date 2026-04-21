import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { ImageUploadField } from '@/components/uploads/image-upload-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isApprovalPendingError } from '@/lib/api-utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Separator } from '@/components/ui/separator'
import {
  getApiErrorMessage,
  useCreateDiet,
  useDietNutritionalBadges,
  useIngredientsList,
  useUpdateDiet,
} from '../api'
import { dietSchema, type DietFormValues } from '../schemas'
import { MEAL_TYPE_LABELS, MEAL_TYPE_OPTIONS, type Diet } from '../types'
import { IngredientPicker } from './ingredient-picker'

const NUTRITIONAL_BADGE_OPTIONS = [
  'Fibra',
  'Proteína',
  'Carbos',
  'Grasa',
  'Alto en proteína',
  'Bajo en calorías',
  'Sin gluten',
  'Vegano',
] as const

function normalizeBadgeLabel(badge: string) {
  return badge.trim().replace(/\s+/g, ' ')
}

function getBadgeKey(badge: string) {
  return normalizeBadgeLabel(badge)
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
}

function BadgesField({ value, onChange }: { value: string[]; onChange: (val: string[]) => void }) {
  const [input, setInput] = useState('')
  const badgesQuery = useDietNutritionalBadges()
  const badgeOptions = mergeBadgeOptions(NUTRITIONAL_BADGE_OPTIONS, badgesQuery.data)

  const hasBadge = (badge: string) => {
    const badgeKey = getBadgeKey(badge)
    return value.some((current) => getBadgeKey(current) === badgeKey)
  }

  const remove = (badge: string) => {
    const badgeKey = getBadgeKey(badge)
    onChange(value.filter((current) => getBadgeKey(current) !== badgeKey))
  }

  const toggle = (badge: string) => {
    const normalizedBadge = normalizeBadgeLabel(badge)

    if (!normalizedBadge) {
      return
    }

    if (hasBadge(normalizedBadge)) {
      remove(normalizedBadge)
      return
    }

    onChange([...value, normalizedBadge])
  }

  const add = () => {
    const normalizedInput = normalizeBadgeLabel(input)
    if (normalizedInput && !hasBadge(normalizedInput)) {
      onChange([...value, normalizedInput])
    }
    setInput('')
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((badge) => (
            <Badge key={badge} variant="outline" className="gap-1 pr-1 text-xs">
              {badge}
              <button
                type="button"
                onClick={() => remove(badge)}
                className="ml-0.5 rounded-full hover:text-status-error"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs flex-none">
              Opciones
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-60 w-48 overflow-y-auto">
            {badgeOptions.map((badge) => (
              <DropdownMenuCheckboxItem
                key={badge}
                checked={hasBadge(badge)}
                onCheckedChange={() => toggle(badge)}
              >
                {badge}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Otro badge (Enter para añadir)"
          className="h-7 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs flex-none"
          onClick={add}
          disabled={!normalizeBadgeLabel(input) || hasBadge(input)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function mergeBadgeOptions(preset: readonly string[], fetched: string[] | undefined) {
  const unique = new Map<string, string>()

  for (const label of [...preset, ...(fetched ?? [])]) {
    const normalized = normalizeBadgeLabel(label)

    if (!normalized) continue

    const key = getBadgeKey(normalized)

    if (!unique.has(key)) {
      unique.set(key, normalized)
    }
  }

  return Array.from(unique.values()).sort((left, right) =>
    left.localeCompare(right, 'es', { sensitivity: 'base' })
  )
}

interface DietFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  diet?: Diet | null
  isDuplicate?: boolean
  onSaved?: () => void
}

const defaultMeal: DietFormValues['meals'][number] = {
  type: 'BREAKFAST',
  name: '',
  image_url: null,
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  nutritional_badges: [],
  order: 0,
  ingredients: [],
}

const defaultValues: DietFormValues = {
  name: '',
  total_calories: null,
  total_protein_g: null,
  total_carbs_g: null,
  total_fat_g: null,
  meals: [{ ...defaultMeal }],
}

function toFormValues(diet: Diet, isDuplicate: boolean): DietFormValues {
  return {
    name: isDuplicate ? `${diet.name} (copia)` : diet.name,
    total_calories: diet.total_calories,
    total_protein_g: diet.total_protein_g,
    total_carbs_g: diet.total_carbs_g,
    total_fat_g: diet.total_fat_g,
    meals: [...diet.meals]
      .sort((a, b) => a.order - b.order)
      .map((meal) => ({
        type: meal.type,
        name: meal.name,
        image_url: meal.image_url,
        calories: meal.calories,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
        nutritional_badges: meal.nutritional_badges,
        order: meal.order,
        ingredients: meal.ingredients.map((mi) => ({
          ingredient_id: mi.ingredient.id,
          quantity: mi.quantity,
          unit: mi.unit,
        })),
      })),
  }
}

function getFirstErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  if ('message' in error && typeof error.message === 'string' && error.message) return error.message
  if (Array.isArray(error)) {
    for (const item of error) {
      const msg = getFirstErrorMessage(item)
      if (msg) return msg
    }
    return undefined
  }
  for (const val of Object.values(error)) {
    const msg = getFirstErrorMessage(val)
    if (msg) return msg
  }
  return undefined
}

export function DietFormDialog({
  open,
  onOpenChange,
  diet,
  isDuplicate = false,
  onSaved,
}: DietFormDialogProps) {
  const isEditing = Boolean(diet) && !isDuplicate
  const createDiet = useCreateDiet()
  const updateDiet = useUpdateDiet()
  const isPending = createDiet.isPending || updateDiet.isPending
  const [uploadingMealFieldIds, setUploadingMealFieldIds] = useState<Set<string>>(() => new Set())
  const isUploadingMealImage = uploadingMealFieldIds.size > 0
  const isBusy = isPending || isUploadingMealImage
  const mealsSectionRef = useRef<HTMLDivElement | null>(null)

  // Pre-fetch ingredients list so it's ready when picker opens
  const ingredientsQuery = useIngredientsList()
  const ingredientsData = ingredientsQuery.data

  const dialogTitle = isEditing ? 'Editar dieta' : isDuplicate ? 'Duplicar dieta' : 'Nueva dieta'
  const dialogDescription = isEditing
    ? 'Modifica los campos y guarda los cambios.'
    : isDuplicate
      ? 'Se creará una copia de la dieta con el mismo contenido.'
      : 'Rellena los datos de la nueva dieta.'

  const form = useForm<DietFormValues>({
    resolver: zodResolver(dietSchema),
    defaultValues,
  })

  const {
    fields: mealFields,
    append,
    remove,
    move,
  } = useFieldArray({
    control: form.control,
    name: 'meals',
  })

  useEffect(() => {
    if (!open) {
      setUploadingMealFieldIds(new Set())
      form.reset(defaultValues)
      return
    }

    setUploadingMealFieldIds(new Set())

    if (diet) {
      form.reset(toFormValues(diet, isDuplicate))
      return
    }
    form.reset(defaultValues)
  }, [form, open, diet, isDuplicate])

  const calculateDietMacros = () => {
    const meals = form.getValues('meals')
    const totals = meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories ?? 0),
        protein_g: acc.protein_g + (meal.protein_g ?? 0),
        carbs_g: acc.carbs_g + (meal.carbs_g ?? 0),
        fat_g: acc.fat_g + (meal.fat_g ?? 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    )
    form.setValue('total_calories', Math.round(totals.calories))
    form.setValue('total_protein_g', Math.round(totals.protein_g * 10) / 10)
    form.setValue('total_carbs_g', Math.round(totals.carbs_g * 10) / 10)
    form.setValue('total_fat_g', Math.round(totals.fat_g * 10) / 10)
  }

  const calculateMealMacros = (mealIndex: number) => {
    const items = form.getValues(`meals.${mealIndex}.ingredients`)

    if (items.length === 0) {
      toast.info('Agrega ingredientes a la comida para calcular sus macros.')
      return
    }

    if (ingredientsQuery.isLoading) {
      toast.info('Espera a que cargue el catálogo de ingredientes antes de recalcular los macros.')
      return
    }

    if (ingredientsQuery.isError) {
      toast.error(
        'No se pudo cargar el catálogo de ingredientes. Reinténtalo o completa los macros manualmente.'
      )
      return
    }

    if (!ingredientsData) {
      const message =
        createDiet.isPending || updateDiet.isPending
          ? 'Espera a que termine el guardado antes de recalcular los macros.'
          : 'Espera a que cargue el catálogo de ingredientes antes de recalcular los macros.'
      toast.info(message)
      return
    }

    const ingredientMap = new Map((ingredientsData?.data ?? []).map((ing) => [ing.id, ing]))

    let calories = 0
    let protein_g = 0
    let carbs_g = 0
    let fat_g = 0
    let calculatedItems = 0
    let omittedItems = 0
    let missingItems = 0

    for (const item of items) {
      const ing = ingredientMap.get(item.ingredient_id)
      if (!ing) {
        missingItems += 1
        continue
      }
      if (item.unit !== 'g') {
        omittedItems += 1
        continue
      }

      const factor = item.quantity / 100
      calories += ing.calories_per_100g * factor
      protein_g += ing.protein_per_100g * factor
      carbs_g += ing.carbs_per_100g * factor
      fat_g += ing.fat_per_100g * factor
      calculatedItems += 1
    }

    if (calculatedItems === 0) {
      if (missingItems > 0) {
        toast.info(
          `No se pudo calcular porque ${missingItems} ingrediente${missingItems === 1 ? '' : 's'} no está${missingItems === 1 ? '' : 'n'} disponible${missingItems === 1 ? '' : 's'} en el catálogo cargado. Revísalo o completa los macros manualmente.`
        )
        return
      }

      toast.info(
        'El autocálculo solo funciona con ingredientes en gramos. Completa los macros manualmente si usas ml o unidades.'
      )
      return
    }

    form.setValue(`meals.${mealIndex}.calories`, Math.round(calories))
    form.setValue(`meals.${mealIndex}.protein_g`, Math.round(protein_g * 10) / 10)
    form.setValue(`meals.${mealIndex}.carbs_g`, Math.round(carbs_g * 10) / 10)
    form.setValue(`meals.${mealIndex}.fat_g`, Math.round(fat_g * 10) / 10)

    const warnings: string[] = []

    if (missingItems > 0) {
      warnings.push(
        `${missingItems} ingrediente${missingItems === 1 ? '' : 's'} no está${missingItems === 1 ? '' : 'n'} disponible${missingItems === 1 ? '' : 's'} en el catálogo cargado`
      )
    }

    if (omittedItems > 0) {
      warnings.push(
        `${omittedItems} ingrediente${omittedItems === 1 ? '' : 's'} con unidades no compatibles quedó${omittedItems === 1 ? '' : 'ron'} fuera`
      )
    }

    if (warnings.length > 0) {
      toast.info(
        `Se calcularon solo los ingredientes en gramos. ${warnings.join('. ')}. Completa esos macros manualmente.`
      )
    }
  }

  const addMeal = () => {
    const order = mealFields.length
    append({ ...defaultMeal, order })
    setTimeout(() => {
      mealsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 50)
  }

  const handleMealUploadChange = (fieldId: string, uploading: boolean) => {
    setUploadingMealFieldIds((current) => {
      if (uploading) {
        if (current.has(fieldId)) return current

        const next = new Set(current)
        next.add(fieldId)
        return next
      }

      if (!current.has(fieldId)) return current

      const next = new Set(current)
      next.delete(fieldId)
      return next
    })
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (isBusy) return
    onOpenChange(nextOpen)
  }

  const handleSubmit = form.handleSubmit(
    async (values) => {
      if (isUploadingMealImage) {
        toast.info('Espera a que termine la subida de la imagen antes de guardar la dieta.')
        return
      }

      // Update order fields
      const normalizedValues: DietFormValues = {
        ...values,
        meals: values.meals.map((meal, i) => ({ ...meal, order: i })),
      }

      try {
        if (isEditing && diet) {
          await updateDiet.mutateAsync({ id: diet.id, values: normalizedValues })
          toast.success('Dieta actualizada correctamente')
        } else {
          await createDiet.mutateAsync(normalizedValues)
          toast.success(
            isDuplicate ? 'Dieta duplicada correctamente' : 'Dieta creada correctamente'
          )
        }
        onSaved?.()
        onOpenChange(false)
      } catch (error) {
        if (isApprovalPendingError(error)) {
          handleDialogOpenChange(false)
          return
        }

        const action = isEditing ? 'actualizar' : 'crear'
        toast.error(getApiErrorMessage(error, `No se ha podido ${action} la dieta`))
      }
    },
    (errors) => {
      toast.error(
        getFirstErrorMessage(errors) ?? 'Revisa los campos obligatorios antes de continuar'
      )
      if (errors.meals) {
        mealsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  )

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
            <fieldset disabled={isBusy} className="min-w-0 space-y-5">
              {/* Datos de la dieta */}
              <div className="space-y-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Información general
                </p>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Dieta de definición" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Macros totales</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={calculateDietMacros}
                    >
                      Calcular desde comidas
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <FormField
                      control={form.control}
                      name="total_calories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Kcal</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              placeholder="2000"
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === '' ? null : parseInt(e.target.value)
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total_protein_g"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Proteína (g)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={0.1}
                              placeholder="150"
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === '' ? null : parseFloat(e.target.value)
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total_carbs_g"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Carbos (g)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={0.1}
                              placeholder="200"
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === '' ? null : parseFloat(e.target.value)
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total_fat_g"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Grasa (g)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={0.1}
                              placeholder="70"
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === '' ? null : parseFloat(e.target.value)
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Comidas */}
              <div ref={mealsSectionRef} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Comidas ({mealFields.length})
                  </p>
                  {form.formState.errors.meals?.root && (
                    <p className="text-xs text-status-error">
                      {form.formState.errors.meals.root.message}
                    </p>
                  )}
                  {form.formState.errors.meals?.message && (
                    <p className="text-xs text-status-error">
                      {form.formState.errors.meals.message}
                    </p>
                  )}
                </div>

                {mealFields.map((mealField, mealIndex) => (
                  <div
                    key={mealField.id}
                    className="rounded-lg border border-border/70 bg-muted/10 p-4 space-y-4"
                  >
                    {/* Meal header */}
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => move(mealIndex, mealIndex - 1)}
                          disabled={mealIndex === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => move(mealIndex, mealIndex + 1)}
                          disabled={mealIndex === mealFields.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <span className="text-xs font-medium text-muted-foreground w-5 text-center flex-none">
                        {mealIndex + 1}
                      </span>

                      <div className="flex flex-1 gap-2 min-w-0">
                        <FormField
                          control={form.control}
                          name={`meals.${mealIndex}.type`}
                          render={({ field }) => (
                            <FormItem className="flex-none w-32">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {MEAL_TYPE_OPTIONS.map((type) => (
                                    <SelectItem key={type} value={type} className="text-xs">
                                      {MEAL_TYPE_LABELS[type]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`meals.${mealIndex}.name`}
                          render={({ field }) => (
                            <FormItem className="flex-1 min-w-0">
                              <FormControl>
                                <Input
                                  placeholder="Nombre de la comida"
                                  className="h-8 text-sm"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {mealFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-status-error flex-none"
                          onClick={() => remove(mealIndex)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Macros de la comida */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Macros de la comida (opcional)
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground px-2"
                          onClick={() => calculateMealMacros(mealIndex)}
                        >
                          Calcular desde ingredientes
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <FormField
                          control={form.control}
                          name={`meals.${mealIndex}.calories`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Kcal</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="500"
                                  value={field.value ?? ''}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value === '' ? null : parseInt(e.target.value)
                                    )
                                  }
                                  className="h-7 text-xs"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`meals.${mealIndex}.protein_g`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Proteína (g)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  placeholder="40"
                                  value={field.value ?? ''}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value === '' ? null : parseFloat(e.target.value)
                                    )
                                  }
                                  className="h-7 text-xs"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`meals.${mealIndex}.carbs_g`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Carbos (g)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  placeholder="60"
                                  value={field.value ?? ''}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value === '' ? null : parseFloat(e.target.value)
                                    )
                                  }
                                  className="h-7 text-xs"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`meals.${mealIndex}.fat_g`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Grasa (g)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  placeholder="20"
                                  value={field.value ?? ''}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value === '' ? null : parseFloat(e.target.value)
                                    )
                                  }
                                  className="h-7 text-xs"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Imagen */}
                    <FormField
                      control={form.control}
                      name={`meals.${mealIndex}.image_url`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <ImageUploadField
                              label="Imagen de la comida"
                              value={field.value ?? ''}
                              onChange={(url) => field.onChange(url || null)}
                              fileKeyPrefix="diets/meals"
                              disabled={isBusy}
                              onUploadingChange={(uploading) =>
                                handleMealUploadChange(mealField.id, uploading)
                              }
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {/* Badges nutricionales */}
                    <FormField
                      control={form.control}
                      name={`meals.${mealIndex}.nutritional_badges`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Badges nutricionales (opcional)</FormLabel>
                          <FormControl>
                            <BadgesField value={field.value ?? []} onChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Ingredientes */}
                    <FormField
                      control={form.control}
                      name={`meals.${mealIndex}.ingredients`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <IngredientPicker
                              value={field.value}
                              onChange={field.onChange}
                              error={getFirstErrorMessage(
                                form.formState.errors.meals?.[mealIndex]?.ingredients
                              )}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={addMeal}
                >
                  <Plus className="h-4 w-4" />
                  Agregar comida
                </Button>
              </div>

              {isUploadingMealImage && (
                <p className="text-xs text-muted-foreground">
                  Espera a que termine la subida de la imagen para seguir editando o guardar la
                  dieta.
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isBusy}>
                  {isPending
                    ? isEditing
                      ? 'Guardando...'
                      : isDuplicate
                        ? 'Creando copia...'
                        : 'Creando...'
                    : isUploadingMealImage
                      ? 'Subiendo imagen...'
                      : isEditing
                        ? 'Guardar cambios'
                        : isDuplicate
                          ? 'Crear copia'
                          : 'Crear dieta'}
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
