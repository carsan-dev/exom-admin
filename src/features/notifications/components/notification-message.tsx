import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationItem } from '../types'

interface NotificationMessageProps {
  item: Pick<NotificationItem, 'title' | 'body' | 'error'>
  className?: string
}

export function NotificationMessage({ item, className }: NotificationMessageProps) {
  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <p className="break-words font-medium text-foreground">{item.title}</p>
      <p className="break-words text-sm text-foreground-secondary">{item.body}</p>
      {item.error && (
        <div className="flex items-start gap-2 text-sm text-status-error">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="break-words">{item.error}</span>
        </div>
      )}
    </div>
  )
}
