import { type ChangeEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Info,
  Plus,
  Upload,
  UtensilsCrossed,
} from 'lucide-react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import {
  FilterToolbar,
  filtersToApiParams,
  type FilterOption,
  type FilterSectionConfig,
  useListFilters,
} from '@/components/filters'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useResourceApprovalBatch } from '@/features/approval-requests/api'
import { buildResourceApprovalMap } from '@/features/approval-requests/types'
import {
  getPageSearchParam,
  replacePaginationSearchParams,
} from '@/lib/pagination-search-params'
import {
  getApiErrorMessage,
  type DietsListParams,
  useDietNutritionalBadges,
  useDietTags,
  useDiets,
  useIngredientsList,
} from '../api'
import { DeleteDietDialog } from '../components/delete-diet-dialog'
import { DietDetailDialog } from '../components/diet-detail-dialog'
import { DietFormDialog } from '../components/diet-form-dialog'
import { DietsTable } from '../components/diets-table'
import { parseDietImport } from '../import-diet'
import type { DietFormValues } from '../schemas'
import type { Diet } from '../types'

const PAGE_SIZE = 10
const MEAL_TYPE_OPTIONS: FilterOption[] = [
  { value: 'BREAKFAST', label: 'Desayuno' },
  { value: 'LUNCH', label: 'Comida' },
  { value: 'SNACK', label: 'Snack' },
  { value: 'DINNER', label: 'Cena' },
]

const AI_IMPORT_PROMPT = `Genera una dieta para EXOM en JSON valido, sin markdown y sin texto adicional.

IMPORTANTE:
- Sustituye solo el bloque "Objetivo de la dieta".
- Usa solo nombres exactos de ingredientes del catalogo EXOM incluido.
- Si quieres 4 comidas, dilo en el objetivo.
- Si quieres variantes, dilo por comida.
- Si no quieres variantes, cada comida debe devolver "variants": [].
- type solo puede ser: "BREAKFAST", "LUNCH", "SNACK" o "DINNER".
- grams_equivalent es obligatorio cuando unit no es "g".

Catalogo de ingredientes disponible:
[CATALOGO_INGREDIENTES]

Objetivo de la dieta:
[MODIFICAR: indica numero de comidas, tipos de comida, si quieres variantes por comida, calorias objetivo, macros objetivo, preferencias, restricciones, alergias y alimentos prohibidos]

Devuelve exactamente este JSON:

{
  "name": "[nombre visible de la dieta]",
  "tags": ["[etiqueta interna 1]", "[etiqueta interna 2]"],
  "total_calories": 2000,
  "total_protein_g": 150,
  "total_carbs_g": 220,
  "total_fat_g": 60,
  "meals": [
    {
      "type": "BREAKFAST",
      "name": "[nombre de la comida]",
      "calories": 450,
      "protein_g": 35,
      "carbs_g": 55,
      "fat_g": 12,
      "nutritional_badges": ["Alto en proteina"],
      "ingredients": [
        {
          "ingredient_name": "[nombre exacto del catalogo]",
          "quantity": 80,
          "unit": "g",
          "grams_equivalent": 80
        }
      ],
      "variants": []
    }
  ]
}

Unidades validas:
g, ml, piece, tablespoon, teaspoon, handful, slice, palm, fist, ladle, cold_cut_slice, glass, cup, bowl, finger, pinch, serving, to_taste.`

const AI_IMPORT_GUIDE_STEPS = [
  {
    title: 'Numero de comidas',
    text: 'Indica en el objetivo si quieres 3, 4, 5 o mas comidas y los tipos esperados.',
  },
  {
    title: 'Variantes',
    text: 'Pide variantes por comida si las necesitas. Si no, ChatGPT debe devolver variants: [] en cada comida.',
  },
  {
    title: 'Catalogo',
    text: 'La IA debe usar solo ingredientes del catalogo incluido para que el formulario los enlace automaticamente.',
  },
]

const AI_IMPORT_NO_VARIANTS_EXAMPLE = `{
  "meals": [
    {
      "type": "LUNCH",
      "name": "Pollo con arroz y verduras",
      "calories": 620,
      "protein_g": 48,
      "carbs_g": 70,
      "fat_g": 16,
      "nutritional_badges": ["Alto en proteina"],
      "ingredients": [
        { "ingredient_name": "Pechuga de pollo", "quantity": 180, "unit": "g", "grams_equivalent": 180 },
        { "ingredient_name": "Arroz", "quantity": 90, "unit": "g", "grams_equivalent": 90 }
      ],
      "variants": []
    }
  ]
}`

const AI_IMPORT_VARIANTS_EXAMPLE = `{
  "type": "SNACK",
  "name": "Yogur con fruta",
  "calories": 260,
  "protein_g": 22,
  "carbs_g": 30,
  "fat_g": 6,
  "nutritional_badges": ["Proteina"],
  "ingredients": [
    { "ingredient_name": "Yogur griego", "quantity": 200, "unit": "g", "grams_equivalent": 200 }
  ],
  "variants": [
    {
      "type": "SNACK",
      "name": "Tostada proteica",
      "calories": 280,
      "protein_g": 20,
      "carbs_g": 28,
      "fat_g": 9,
      "nutritional_badges": ["Proteina"],
      "ingredients": [
        { "ingredient_name": "Pan integral", "quantity": 2, "unit": "slice", "grams_equivalent": 60 }
      ]
    }
  ]
}`

const AI_IMPORT_UNITS_EXAMPLE = `{
  "ingredients": [
    { "ingredient_name": "Avena", "quantity": 60, "unit": "g", "grams_equivalent": 60 },
    { "ingredient_name": "Aceite de oliva", "quantity": 1, "unit": "tablespoon", "grams_equivalent": 15 }
  ]
}`

function buildImportPromptWithIngredientCatalog(ingredientNames: string[]) {
  const catalog =
    ingredientNames.length > 0
      ? ingredientNames.map((name) => `- ${name}`).join('\n')
      : '[pega aqui los nombres exactos de ingredientes del catalogo EXOM, uno por linea]'

  return AI_IMPORT_PROMPT.replace('[CATALOGO_INGREDIENTES]', catalog)
}

function toFilterOptions(values?: string[]): FilterOption[] {
  return values?.map((value) => ({ value, label: value })) ?? []
}

function DietsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )
}

export function DietsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDiet, setSelectedDiet] = useState<Diet | null>(null)
  const [editingDiet, setEditingDiet] = useState<Diet | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [importedValues, setImportedValues] = useState<DietFormValues | null>(null)
  const [importIssues, setImportIssues] = useState<string[]>([])
  const [importPromptOpen, setImportPromptOpen] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const page = getPageSearchParam(searchParams.get('page'))
  const deferredSearch = useDeferredValue(search)
  const activeSearch = deferredSearch.trim()
  const tagsQuery = useDietTags()
  const nutritionalBadgesQuery = useDietNutritionalBadges()
  const ingredientsQuery = useIngredientsList()
  const sections = useMemo<FilterSectionConfig[]>(
    () => [
      {
        type: 'multi',
        key: 'meal_types',
        label: 'Tipo de comida',
        options: MEAL_TYPE_OPTIONS,
      },
      {
        type: 'multi',
        key: 'tags',
        label: 'Etiquetas',
        options: toFilterOptions(tagsQuery.data),
        isLoading: tagsQuery.isLoading,
      },
      {
        type: 'multi',
        key: 'nutritional_badges',
        label: 'Badges nutricionales',
        options: toFilterOptions(nutritionalBadgesQuery.data),
        isLoading: nutritionalBadgesQuery.isLoading,
      },
      {
        type: 'date-range',
        key: 'updated',
        label: 'Actualizada',
      },
    ],
    [nutritionalBadgesQuery.data, nutritionalBadgesQuery.isLoading, tagsQuery.data, tagsQuery.isLoading]
  )
  const filters = useListFilters(sections)
  const dietFilterParams = filtersToApiParams(filters.values, sections) as Partial<DietsListParams>
  const pageResetKey = `${activeSearch}::${JSON.stringify(dietFilterParams)}`
  const lastPageResetKeyRef = useRef(pageResetKey)

  useEffect(() => {
    if (lastPageResetKeyRef.current === pageResetKey) {
      return
    }

    lastPageResetKeyRef.current = pageResetKey
    replacePaginationSearchParams(setSearchParams, { page: 1 })
  }, [pageResetKey, setSearchParams])

  const dietsQuery = useDiets({
    page,
    limit: PAGE_SIZE,
    search: activeSearch,
    ...dietFilterParams,
  })
  const diets = dietsQuery.data?.data ?? []
  const dietApprovalQuery = useResourceApprovalBatch(
    'diet',
    diets.map((diet) => diet.id)
  )
  const dietApprovalById = buildResourceApprovalMap(dietApprovalQuery.data ?? [])
  const total = dietsQuery.data?.total ?? 0
  const totalPages = Math.max(1, dietsQuery.data?.totalPages ?? 1)
  const hasActiveFilters = filters.activeCount > 0
  const hasQuery = activeSearch.length > 0 || hasActiveFilters

  const handleCreate = () => {
    setEditingDiet(null)
    setIsDuplicate(false)
    setImportedValues(null)
    setImportIssues([])
    setFormDialogOpen(true)
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleCopyImportPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_IMPORT_PROMPT)
      toast.success('Plantilla copiada')
    } catch {
      toast.error('No se ha podido copiar el prompt')
    }
  }

  const handleCopyImportPromptWithCatalog = async () => {
    const ingredientNames = (ingredientsQuery.data?.data ?? [])
      .map((ingredient) => ingredient.name.trim())
      .filter(Boolean)

    if (ingredientNames.length === 0) {
      toast.error('No hay ingredientes cargados para incluir en el prompt')
      return
    }

    try {
      await navigator.clipboard.writeText(buildImportPromptWithIngredientCatalog(ingredientNames))
      toast.success(`Prompt copiado con ${ingredientNames.length} ingredientes`)
    } catch {
      toast.error('No se ha podido copiar el prompt')
    }
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.error('Selecciona un archivo .json')
      return
    }

    try {
      const text = await file.text()
      const result = parseDietImport(file.name, text, ingredientsQuery.data?.data ?? [])

      setEditingDiet(null)
      setIsDuplicate(false)
      setImportedValues(result.values)
      setImportIssues(result.issues)
      setFormDialogOpen(true)

      if (result.issues.length > 0) {
        toast.warning('Dieta importada con avisos. Revisa ingredientes no enlazados.')
        return
      }

      toast.success('Dieta importada. Revisa y guarda para crear.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se ha podido importar el archivo')
    }
  }

  const handleView = (diet: Diet) => {
    setSelectedDiet(diet)
    setDetailDialogOpen(true)
  }

  const handleEdit = (diet: Diet) => {
    setEditingDiet(diet)
    setIsDuplicate(false)
    setImportedValues(null)
    setImportIssues([])
    setFormDialogOpen(true)
  }

  const handleDuplicate = (diet: Diet) => {
    setEditingDiet(diet)
    setIsDuplicate(true)
    setImportedValues(null)
    setImportIssues([])
    setFormDialogOpen(true)
  }

  const handleDelete = (diet: Diet) => {
    setSelectedDiet(diet)
    setDeleteDialogOpen(true)
  }

  const handleFormDialogOpenChange = (open: boolean) => {
    setFormDialogOpen(open)
    if (!open) {
      setEditingDiet(null)
      setIsDuplicate(false)
      setImportedValues(null)
      setImportIssues([])
    }
  }

  const handleDetailDialogOpenChange = (open: boolean) => {
    setDetailDialogOpen(open)
    if (!open) setSelectedDiet(null)
  }

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open)
    if (!open) setSelectedDiet(null)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-none sm:shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-primary">
            Catálogo
          </p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dietas</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gestiona el catálogo de planes nutricionales. Crea dietas con comidas e ingredientes.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `${total} dieta${total !== 1 ? 's' : ''} en el catálogo`
              : 'Aún no hay dietas en el catálogo'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:self-start lg:justify-end">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="outline" onClick={handleImportClick}>
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Ver instrucciones de importacion"
                  onClick={() => setImportPromptOpen(true)}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Instrucciones y prompt de IA</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Nueva dieta
          </Button>
        </div>
      </div>

      {/* Content */}
      {dietsQuery.isLoading ? (
        <DietsTableSkeleton />
      ) : dietsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                No se ha podido cargar el catálogo
              </h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {getApiErrorMessage(dietsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
              </p>
            </div>
            <Button onClick={() => dietsQuery.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : total === 0 && !hasQuery ? (
        <Card className="border-dashed border-border/70">
          <CardContent className="flex flex-col items-center gap-4 pt-10 text-center">
            <div className="rounded-full bg-brand-soft/10 p-4 text-brand-primary">
              <UtensilsCrossed className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Aún no hay dietas</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Crea la primera dieta para empezar a asignarla a tus clientes.
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Crear primera dieta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Listado de dietas</CardTitle>
            <CardDescription>
              Vista paginada del catálogo con búsqueda y acciones por dieta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FilterToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por nombre..."
              sections={sections}
              filters={filters}
            />

            {diets.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No se encontraron dietas con la búsqueda y filtros actuales.
              </p>
            ) : (
              <DietsTable
                diets={diets}
                approvalById={dietApprovalById}
                onView={handleView}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            )}

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    replacePaginationSearchParams(setSearchParams, {
                      page: Math.max(1, page - 1),
                    })
                  }
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    replacePaginationSearchParams(setSearchParams, {
                      page: Math.min(totalPages, page + 1),
                    })
                  }
                  disabled={page >= totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <DietFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormDialogOpenChange}
        diet={editingDiet}
        isDuplicate={isDuplicate}
        importedValues={importedValues}
        importIssues={importIssues}
        onSaved={() => {
          if (!editingDiet || isDuplicate) {
            replacePaginationSearchParams(setSearchParams, { page: 1 })
            setSearch('')
          }
        }}
      />

      <DietDetailDialog
        diet={selectedDiet}
        open={detailDialogOpen}
        onOpenChange={handleDetailDialogOpenChange}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
      />

      <DeleteDietDialog
        diet={selectedDiet}
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        onDeleted={() => replacePaginationSearchParams(setSearchParams, { page: 1 })}
      />

      <Dialog open={importPromptOpen} onOpenChange={setImportPromptOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader className="pr-8">
            <DialogTitle>Prompt para generar JSON compatible</DialogTitle>
            <DialogDescription>
              Copia esta plantilla en tu IA. Solo cambia el objetivo de la dieta y usa el catalogo
              incluido para enlazar ingredientes.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
            Si quieres 4 comidas, dilo en el objetivo. Si quieres variantes, dilo por comida. Si
            no quieres variantes, ChatGPT debe devolver <span className="font-semibold">variants: []</span>.
            Usa solo ingredientes del catalogo incluido.
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
            {ingredientsQuery.isLoading
              ? 'Cargando catalogo de ingredientes para poder incluirlo automaticamente...'
              : ingredientsQuery.isError
                ? 'No se ha podido cargar el catalogo. Puedes copiar la plantilla y pegar los nombres manualmente.'
                : `El boton "Copiar con catalogo" incluira ${ingredientsQuery.data?.data.length ?? 0} ingredientes cargados.`}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {AI_IMPORT_GUIDE_STEPS.map((step) => (
              <div key={step.title} className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Sin variantes</p>
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
                <code>{AI_IMPORT_NO_VARIANTS_EXAMPLE}</code>
              </pre>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Con variantes</p>
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
                <code>{AI_IMPORT_VARIANTS_EXAMPLE}</code>
              </pre>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Gramos y medida casera</p>
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
                <code>{AI_IMPORT_UNITS_EXAMPLE}</code>
              </pre>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleCopyImportPrompt}>
              <Copy className="h-4 w-4" />
              Copiar plantilla
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCopyImportPromptWithCatalog}
              disabled={ingredientsQuery.isLoading || (ingredientsQuery.data?.data.length ?? 0) === 0}
            >
              <Copy className="h-4 w-4" />
              Copiar con catalogo
            </Button>
          </div>

          <pre className="max-h-[56vh] overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-foreground">
            <code>{AI_IMPORT_PROMPT}</code>
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
