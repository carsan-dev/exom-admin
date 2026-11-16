import { AlertTriangle } from 'lucide-react'

interface TrainingFormHeaderProps {
  importIssues: string[]
}

/** Título y descripción viven en la cabecera del Workbench; aquí solo el aviso de la importación. */
export function TrainingFormHeader({ importIssues }: TrainingFormHeaderProps) {
  if (importIssues.length === 0) return null

  return (
    <div className="mb-8 border border-status-warning/45 bg-status-warning-soft p-3 text-sm text-status-warning">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
        <div className="min-w-0 space-y-1">
          <p className="font-medium">Revisa ejercicios no enlazados</p>
          <ul className="list-disc space-y-1 pl-4 text-xs [overflow-wrap:anywhere]">
            {importIssues.map((issue, index) => (
              <li key={`${issue}-${index}`}>{issue}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
