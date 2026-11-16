import type { ReactNode } from 'react'
import { EmptyState } from '@/components/page'
import { Button } from '@/components/ui/button'

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
    <EmptyState
      className="border-y border-border"
      icon={icon}
      title={title}
      description={description}
      action={actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : undefined}
    />
  )
}
