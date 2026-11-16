import type { ChangeEvent, RefObject } from 'react'
import { Info, Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface TrainingsPageHeaderProps {
  total: number
  importInputRef: RefObject<HTMLInputElement | null>
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void
  onImportClick: () => void
  importDisabled: boolean
  onOpenImportPrompt: () => void
  onCreate: () => void
}

export function TrainingsPageHeader({
  total,
  importInputRef,
  onImportFile,
  onImportClick,
  importDisabled,
  onOpenImportPrompt,
  onCreate,
}: TrainingsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-none sm:shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-text">Catálogo</p>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Entrenamientos</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Gestiona el catálogo de entrenamientos. Crea rutinas con ejercicios, series, reps y más.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `${total} entrenamientos en el catálogo`
            : 'Aún no hay entrenamientos en el catálogo'}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row lg:self-start">
        <input
          ref={importInputRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          className="hidden"
          onChange={onImportFile}
        />
        <Button type="button" variant="outline" onClick={onImportClick} disabled={importDisabled}>
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
                onClick={onOpenImportPrompt}
                aria-label="Ver prompt para generar entrenamientos importables"
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Prompt para IA</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Nuevo entrenamiento
        </Button>
      </div>
    </div>
  )
}
