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
  AI_IMPORT_GUIDE_STEPS,
  AI_IMPORT_NO_VARIANTS_EXAMPLE,
  AI_IMPORT_PROMPT,
  AI_IMPORT_UNITS_EXAMPLE,
  AI_IMPORT_VARIANTS_EXAMPLE,
} from '../ai-import-prompt'

interface AiImportPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredientsLoading: boolean
  ingredientsError: boolean
  ingredientCount: number
  onCopyPrompt: () => void
  onCopyPromptWithCatalog: () => void
}

export function AiImportPromptDialog({
  open,
  onOpenChange,
  ingredientsLoading,
  ingredientsError,
  ingredientCount,
  onCopyPrompt,
  onCopyPromptWithCatalog,
}: AiImportPromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Prompt para generar JSON compatible</DialogTitle>
          <DialogDescription>
            Copia esta plantilla en tu IA. Solo cambia el objetivo de la dieta y usa el catálogo
            incluido para enlazar ingredientes.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-status-warning/30 bg-status-warning-soft p-3 text-sm text-status-warning">
          Si quieres 4 comidas, dilo en el objetivo. Si quieres variantes, dilo por comida. Si no
          quieres variantes, ChatGPT debe devolver{' '}
          <span className="font-semibold">variants: []</span>. Usa solo ingredientes del catálogo
          incluido.
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
          {ingredientsLoading
            ? 'Cargando catálogo de ingredientes para poder incluirlo automáticamente...'
            : ingredientsError
              ? 'No se ha podido cargar el catálogo. Puedes copiar la plantilla y pegar los nombres manualmente.'
              : `El botón "Copiar con catálogo" incluirá ${ingredientCount} ingredientes cargados.`}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
          <Button type="button" variant="outline" size="sm" onClick={onCopyPrompt}>
            <Copy className="h-4 w-4" />
            Copiar plantilla
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onCopyPromptWithCatalog}
            disabled={ingredientsLoading || ingredientCount === 0}
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
