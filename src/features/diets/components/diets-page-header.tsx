import type { ChangeEvent, RefObject } from 'react'
import { Info, Plus, Upload } from 'lucide-react'
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
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-none sm:shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent-text">Catálogo</p>
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
          onChange={onImportFile}
        />
        <Button variant="outline" onClick={onImportClick}>
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
                aria-label="Ver instrucciones de importación"
                onClick={onOpenImportPrompt}
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Instrucciones y prompt de IA</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Nueva dieta
        </Button>
      </div>
    </div>
  )
}
