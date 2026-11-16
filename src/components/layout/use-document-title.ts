import { useEffect } from 'react'
import { NAV_GROUPS, resolveNavGroups } from './nav-model'

/** Sufijo común: el `<title>` de `index.html`. */
export const APP_TITLE = 'EXOM Admin'
export const NOT_FOUND_TITLE = 'Página no encontrada'

const DETAIL_TITLES: Record<string, string> = {
  clients: 'Detalle de cliente',
  users: 'Detalle de usuario',
  recaps: 'Detalle de recap',
}

export function formatDocumentTitle(section: string | null): string {
  return section ? `${section} · ${APP_TITLE}` : APP_TITLE
}

/**
 * Sección de una ruta del shell, tomada del mismo modelo de navegación que la barra lateral.
 * Devuelve null en la raíz (redirige al Dashboard) y NOT_FOUND_TITLE si la ruta no existe.
 */
export function resolveRouteTitle(pathname: string, role: string | undefined): string | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  if (segments.length === 1) {
    const to = `/${segments[0]}`
    if (to === '/users' || (to === '/clients' && role === 'SUPER_ADMIN')) return 'Usuarios'
    const visible = resolveNavGroups(role)
      .flatMap((group) => group.items)
      .find((item) => item.to === to)
    if (visible) return visible.label
    const anyRoleItem = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.to === to)
    if (anyRoleItem) return anyRoleItem.label
  }

  if (segments.length === 2) {
    const detail = DETAIL_TITLES[segments[0]]
    if (detail) return detail
  }

  return NOT_FOUND_TITLE
}

/** Título del documento «<sección> · EXOM Admin» (WCAG 2.4.2). */
export function useDocumentTitle(section: string | null) {
  useEffect(() => {
    document.title = formatDocumentTitle(section)
  }, [section])
}
