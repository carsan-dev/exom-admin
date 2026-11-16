import { useEffect, useRef, type RefObject } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import type { Client, Role } from '../types'
import { ClientsDesktopTable } from './clients-desktop-table'
import { ClientsMobileList } from './clients-mobile-list'

interface ClientsTableProps {
  clients: Client[]
  currentUserRole: Role
  actionDialogOpen?: boolean
  onUnlock: (client: Client) => void
  onChangeRole: (client: Client) => void
  onManageAssignments: (client: Client) => void
  onToggleStatus: (client: Client) => void
  onArchive: (client: Client) => void
  onDelete: (client: Client) => void
}

/** Props comunes de las dos variantes (tabla y lista apilada). */
export interface ClientsListViewProps extends Omit<ClientsTableProps, 'actionDialogOpen'> {
  actionTriggerRef: RefObject<HTMLButtonElement | null>
}

export function ClientsTable({ actionDialogOpen = false, ...viewProps }: ClientsTableProps) {
  // Tabla desde md; lista apilada por debajo. Solo se monta una variante.
  const isDesktop = useMediaQuery('(min-width: 768px)', true)
  const containerRef = useRef<HTMLDivElement>(null)
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null)
  const wasActionDialogOpen = useRef(actionDialogOpen)

  useEffect(() => {
    const shouldRestoreFocus = wasActionDialogOpen.current && !actionDialogOpen
    wasActionDialogOpen.current = actionDialogOpen
    if (!shouldRestoreFocus) return

    // Dialogs are controlled by the page, outside the row's Radix trigger scope.
    // Restore after their focus trap closes; the row may have been removed.
    const frame = requestAnimationFrame(() => {
      const trigger = actionTriggerRef.current
      if (trigger?.isConnected) trigger.focus()
      else containerRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [actionDialogOpen])

  return (
    <div ref={containerRef} tabIndex={-1} className="focus:outline-none">
      {isDesktop ? (
        <ClientsDesktopTable {...viewProps} actionTriggerRef={actionTriggerRef} />
      ) : (
        <ClientsMobileList {...viewProps} actionTriggerRef={actionTriggerRef} />
      )}
    </div>
  )
}
