import type { ChangeEvent, RefObject } from 'react'
import { Info, Plus, Upload } from 'lucide-react'
import { PageHeader } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface DietsPageHeaderProps {
  total: number
  importInputRef: RefObject<HTMLInputElement | null>
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => void
  onImportClick: () => void
  onOpenImportPrompt: () => void
  onCreate: () => void
}

export function DietsPageHeader({
  total,
  importInputRef,
  onImportFile,
  onImportClick,
  onOpenImportPrompt,
  onCreate,
}: DietsPageHeaderProps) {
  return (
    <PageHeader
      eyebrow="Planificación"
      title="Dietas"
      description={
        <>
          Gestiona el catálogo de planes nutricionales. Crea dietas con comidas e ingredientes.
          <span className="mt-1 block tabular-nums text-foreground-muted">
            {total > 0
              ? `${total} dieta${total !== 1 ? 's' : ''} en el catálogo`
              : 'Aún no hay dietas en el catálogo'}
          </span>
        </>
      }
      actions={
        <>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onImportFile}
          />
          <Button variant="outline" onClick={onImportClick} className="max-md:h-11">
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
                  aria-label="Ver instrucciones de importación"
                  onClick={onOpenImportPrompt}
                  className="max-md:size-11"
                >
                  <Info aria-hidden="true" className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Instrucciones y prompt de IA</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={onCreate} className="max-md:h-11">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nueva dieta
          </Button>
        </>
      }
    />
  )
}
