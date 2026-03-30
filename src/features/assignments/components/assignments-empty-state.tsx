import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface AssignmentsEmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function AssignmentsEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: AssignmentsEmptyStateProps) {
  return (
    <Card className="border-dashed border-border/70">
      <CardContent className="flex flex-col items-center gap-4 pt-10 text-center">
        <div className="rounded-full bg-brand-soft/10 p-4 text-brand-primary">{icon}</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>
        {actionLabel && onAction && (
          <Button onClick={onAction}>{actionLabel}</Button>
        )}
      </CardContent>
    </Card>
  )
}
