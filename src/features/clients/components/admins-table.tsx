import { useMediaQuery } from '@/hooks/use-media-query'
import type { AdminUserListItem } from '../types'
import { AdminsDesktopTable } from './admins-desktop-table'
import { AdminsMobileList } from './admins-mobile-list'

/** Props comunes de las dos variantes (tabla y lista apilada). */
export interface AdminsListViewProps {
  admins: AdminUserListItem[]
  currentUserId?: string
  onEdit: (admin: AdminUserListItem) => void
  onUnlock: (admin: AdminUserListItem) => void
  onChangeRole: (admin: AdminUserListItem) => void
  onToggleStatus: (admin: AdminUserListItem) => void
}

export function AdminsTable(props: AdminsListViewProps) {
  // Tabla desde md; lista apilada por debajo. Solo se monta una variante.
  const isDesktop = useMediaQuery('(min-width: 768px)', true)

  return isDesktop ? <AdminsDesktopTable {...props} /> : <AdminsMobileList {...props} />
}
