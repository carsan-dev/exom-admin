import { AlertTriangle } from 'lucide-react'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface TrainingFormHeaderProps {
  title: string
  description: string
  importIssues: string[]
}

export function TrainingFormHeader({ title, description, importIssues }: TrainingFormHeaderProps) {
  return (
    <>
      <DialogHeader className="pr-8">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      {importIssues.length > 0 && (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning-soft p-3 text-sm text-status-warning">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <div className="space-y-1">
              <p className="font-medium">Revisa ejercicios no enlazados</p>
              <ul className="list-disc space-y-1 pl-4 text-xs">
                {importIssues.map((issue, index) => (
                  <li key={`${issue}-${index}`}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
