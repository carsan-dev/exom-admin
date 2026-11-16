import { AlertTriangle } from 'lucide-react'

interface DietImportIssuesProps {
  issues: string[]
}

export function DietImportIssues({ issues }: DietImportIssuesProps) {
  return (
    <div className="rounded-lg border border-status-warning/30 bg-status-warning-soft p-3 text-sm text-status-warning">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
        <div className="space-y-1">
          <p className="font-medium">Revisa ingredientes no enlazados</p>
          <p className="text-xs">
            Puedes corregirlos manualmente con el selector de ingredientes antes de guardar.
          </p>
          <ul className="list-disc space-y-1 pl-4 text-xs">
            {issues.map((issue, index) => (
              <li key={`${issue}-${index}`}>{issue}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
