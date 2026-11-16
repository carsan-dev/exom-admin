import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AI_IMPORT_CIRCUIT_EXAMPLE,
  AI_IMPORT_GUIDE_STEPS,
  AI_IMPORT_NO_CIRCUIT_EXAMPLE,
  AI_IMPORT_PROMPT,
} from '../ai-import-prompt'

interface AiImportPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalogLoading: boolean
  catalogError: boolean
  catalogCount: number
  onCopyTemplate: () => void
  onCopyWithCatalog: () => void
}

export function AiImportPromptDialog({
  open,
  onOpenChange,
  catalogLoading,
  catalogError,
  catalogCount,
  onCopyTemplate,
  onCopyWithCatalog,
}: AiImportPromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Prompt para generar JSON compatible</DialogTitle>
          <DialogDescription>
            Copia esta plantilla en tu IA. Cambia cada bloque [MODIFICAR] antes de generar el
            archivo para importar.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-status-warning/30 bg-status-warning-soft p-3 text-sm text-status-warning">
          Las partes entre <span className="font-semibold">[MODIFICAR]</span> son obligatorias. Si
          no hay circuito, elimina el bloque <span className="font-semibold">CIRCUIT</span>. Si hay
          varios ejercicios, duplica bloques <span className="font-semibold">EXERCISE</span>.
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          {catalogLoading
            ? 'Cargando catálogo de ejercicios para poder incluirlo automáticamente...'
            : catalogError
              ? 'No se ha podido cargar el catálogo. Puedes copiar la plantilla y pegar los nombres manualmente.'
              : `El botón "Copiar con catálogo" incluirá ${catalogCount} ejercicios cargados.`}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {AI_IMPORT_GUIDE_STEPS.map((step) => (
            <div key={step.title} className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Ejemplo sin circuito</p>
            <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
              <code>{AI_IMPORT_NO_CIRCUIT_EXAMPLE}</code>
            </pre>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Ejemplo con circuito</p>
            <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
              <code>{AI_IMPORT_CIRCUIT_EXAMPLE}</code>
            </pre>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onCopyTemplate}>
            <Copy className="h-4 w-4" />
            Copiar plantilla
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onCopyWithCatalog}
            disabled={catalogLoading || catalogCount === 0}
          >
            <Copy className="h-4 w-4" />
            Copiar con catálogo
          </Button>
        </div>

        <pre className="max-h-[56vh] overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-foreground">
          <code>{AI_IMPORT_PROMPT}</code>
        </pre>
      </DialogContent>
    </Dialog>
  )
}
