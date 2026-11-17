import { Badge } from '@/components/ui/badge'
import type { NotificationTemplate } from '../types'

export function TemplateVariables({ template }: { template: NotificationTemplate }) {
  if (template.variables.length === 0) {
    return (
      <div className="border border-dashed border-border-strong p-4 text-[13px] leading-5 text-foreground-secondary">
        Esta plantilla no recibe datos dinámicos. El texto se enviará tal como está escrito.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-5 text-foreground-secondary">
        Las variables se reemplazan al enviar. Mantén las llaves si quieres conservar ese dato dinámico.
      </p>
      <div className="space-y-2">
        {template.variables.map((variable) => (
          <div key={variable} className="border border-border bg-background-surface p-3">
            <Badge variant="outline" className="rounded-none border-border-strong bg-background px-2 py-0 font-mono text-xs text-foreground">
              {`{${variable}}`}
            </Badge>
            <p className="mt-2 text-[13px] leading-5 text-foreground-secondary">
              {template.variable_help[variable] ?? 'Dato dinámico que el sistema reemplaza al enviar.'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
