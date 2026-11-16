import { Badge } from '@/components/ui/badge'
import type { NotificationTemplate } from '../types'

export function TemplateVariables({ template }: { template: NotificationTemplate }) {
  if (template.variables.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Esta plantilla no recibe datos dinámicos. El texto se enviará tal como está escrito.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Las variables se reemplazan al enviar. Mantén las llaves si quieres conservar ese dato dinámico.
      </p>
      <div className="space-y-2">
        {template.variables.map((variable) => (
          <div key={variable} className="rounded-lg border border-border bg-muted/20 p-3">
            <Badge variant="outline" className="border-brand-primary/20 bg-brand-soft/10 text-accent-text">
              {`{${variable}}`}
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              {template.variable_help[variable] ?? 'Dato dinámico que el sistema reemplaza al enviar.'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
