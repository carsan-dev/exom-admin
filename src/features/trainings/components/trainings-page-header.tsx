import type { ChangeEvent, RefObject } from 'react'
import { Info, Plus, Upload } from 'lucide-react'
import { PageHeader } from '@/components/page'
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
    <PageHeader
      eyebrow="Planificación"
      title="Entrenamientos"
      description={
        <>
          Gestiona el catálogo de entrenamientos. Crea rutinas con ejercicios, series, reps y más.
          <span className="mt-1 block tabular-nums text-foreground-muted">
            {total > 0
              ? `${total} entrenamientos en el catálogo`
              : 'Aún no hay entrenamientos en el catálogo'}
          </span>
        </>
      }
      actions={
        <>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="hidden"
            onChange={onImportFile}
          />
          <Button
            type="button"
            variant="outline"
            onClick={onImportClick}
            disabled={importDisabled}
            className="max-md:h-11"
          >
            <Upload aria-hidden="true" className="h-4 w-4" />
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
                  className="max-md:size-11"
                >
                  <Info aria-hidden="true" className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Prompt para IA</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={onCreate} className="max-md:h-11">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nuevo entrenamiento
          </Button>
        </>
      }
    />
  )
}
