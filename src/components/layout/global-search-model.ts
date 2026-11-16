import { FileText, MessageSquare, Plus, Send, ShieldCheck, type LucideIcon } from 'lucide-react'
import { encodeClientsUrlFilters } from '@/features/clients/clients-url-filters'
import { getUsersRoute } from '@/features/clients/types'
import { resolveNavGroups } from './nav-model'

/** Minimum query length before the clients search hits the API. */
export const CLIENT_SEARCH_MIN_LENGTH = 2
/** Debounce applied to the clients search, in milliseconds. */
export const CLIENT_SEARCH_DEBOUNCE_MS = 250
/** Maximum number of clients requested. */
export const CLIENT_SEARCH_LIMIT = 5

export interface SearchEntry {
  id: string
  to: string
  label: string
  /** Secondary text shown at the end of the row (group or route). */
  hint: string
  /** The hint is the raw route: shown on desktop, hidden on mobile where it would truncate. */
  hintIsRoute?: boolean
  icon: LucideIcon
}

interface ActionDefinition {
  to: string
  label: string
  icon: LucideIcon
  superAdminOnly?: boolean
}

// Navigation only: every action opens an existing route, never a dialog or a mutation.
const ACTIONS: ActionDefinition[] = [
  { to: '/notification-templates', label: 'Nueva plantilla', icon: Plus, superAdminOnly: true },
  { to: '/notifications', label: 'Enviar notificación', icon: Send },
  { to: '/approval-requests?status=PENDING', label: 'Ver solicitudes pendientes', icon: ShieldCheck },
  { to: '/feedback?status=PENDING', label: 'Ver feedback pendiente', icon: MessageSquare },
  { to: '/recaps?status=SUBMITTED', label: 'Ver recaps enviados', icon: FileText },
]

const UNLABELED_GROUP_HINT = 'Inicio'

/** Menu destinations for a role, from the same model and filter the sidebar uses. */
export function getNavigationEntries(role: string | undefined): SearchEntry[] {
  return resolveNavGroups(role).flatMap((group) =>
    group.items.map((item) => ({
      id: `nav:${item.to}`,
      to: item.to,
      label: item.label,
      hint: group.label ?? UNLABELED_GROUP_HINT,
      icon: item.icon,
    })),
  )
}

export function getActionEntries(role: string | undefined): SearchEntry[] {
  return ACTIONS.filter((action) => !action.superAdminOnly || role === 'SUPER_ADMIN').map(
    (action) => ({
      id: `action:${action.to}:${action.label}`,
      to: action.to,
      label: action.label,
      hint: action.to,
      hintIsRoute: true,
      icon: action.icon,
    }),
  )
}

/**
 * Case- and accent-insensitive substring match. Returns the matched range in the
 * original text, or null. No fuzzy ranking (out of scope, D21).
 */
export function findMatch(text: string, query: string): [number, number] | null {
  const foldedQuery = fold(query)
  if (foldedQuery === '') {
    return null
  }

  let folded = ''
  const origins: number[] = []
  const ends: number[] = []
  let index = 0
  for (const char of text) {
    const piece = fold(char)
    for (let i = 0; i < piece.length; i += 1) {
      origins.push(index)
      ends.push(index + char.length)
    }
    folded += piece
    index += char.length
  }

  const at = folded.indexOf(foldedQuery)
  if (at < 0) {
    return null
  }

  return [origins[at], ends[at + foldedQuery.length - 1]]
}

function fold(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function filterEntries(entries: SearchEntry[], query: string): SearchEntry[] {
  const trimmed = query.trim()
  if (trimmed === '') {
    return entries
  }
  return entries.filter((entry) => findMatch(entry.label, trimmed) !== null)
}

export function formatResultCount(count: number) {
  if (count === 0) return 'Sin resultados'
  if (count === 1) return '1 resultado'
  return `${count} resultados`
}

export type ClientsAnnouncementStatus = 'off' | 'loading' | 'error' | 'ready'

/** Live-region text: loading and error of the clients search never read as a plain count. */
export function formatAnnouncement(count: number, clientsStatus: ClientsAnnouncementStatus) {
  if (clientsStatus === 'loading') return 'Buscando clientes…'
  if (clientsStatus === 'error') {
    const failure = 'No se pudieron buscar clientes'
    return count === 0 ? failure : `${formatResultCount(count)} · ${failure}`
  }
  return formatResultCount(count)
}

export function getClientDetailPath(clientId: string, role: string | undefined) {
  return `${getUsersRoute(role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN')}/${clientId}`
}

/** Clients list with the search the list page already reads (`clientsFilters=q:<text>`). */
export function getClientsListPath(search: string, role: string | undefined) {
  const base = getUsersRoute(role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN')
  const encoded = encodeClientsUrlFilters({ search, values: {} }, [])
  if (encoded === '') {
    return base
  }
  return `${base}?${new URLSearchParams({ clientsFilters: encoded }).toString()}`
}

export function getClientsListLabel(role: string | undefined) {
  return role === 'SUPER_ADMIN' ? 'Ver todos en Usuarios' : 'Ver todos en Clientes'
}
