import { describe, expect, it } from 'vitest'
import { Bell } from 'lucide-react'
import { resolveNavGroups } from './nav-model'
import {
  CLIENT_SEARCH_DEBOUNCE_MS,
  CLIENT_SEARCH_LIMIT,
  CLIENT_SEARCH_MIN_LENGTH,
  filterEntries,
  findMatch,
  formatResultCount,
  getActionEntries,
  getClientDetailPath,
  getClientsListLabel,
  getClientsListPath,
  getNavigationEntries,
  type SearchEntry,
} from './global-search-model'

function entry(label: string, to = `/${label.toLowerCase()}`): SearchEntry {
  return { id: `nav:${to}`, to, label, hint: 'Grupo', icon: Bell }
}

describe('modelo del buscador global', () => {
  it('fija los parámetros de la búsqueda de clientes', () => {
    expect(CLIENT_SEARCH_MIN_LENGTH).toBe(2)
    expect(CLIENT_SEARCH_DEBOUNCE_MS).toBe(250)
    expect(CLIENT_SEARCH_LIMIT).toBe(5)
  })

  describe('findMatch', () => {
    it('encuentra una subcadena sin distinguir mayúsculas', () => {
      expect(findMatch('Notificaciones', 'NOTI')).toEqual([0, 4])
      expect(findMatch('Ver feedback pendiente', 'Feedback')).toEqual([4, 12])
    })

    it('ignora las tildes en el texto y en la consulta', () => {
      expect(findMatch('Enviar notificación', 'notificacion')).toEqual([7, 19])
      expect(findMatch('Catálogo', 'catalogo')).toEqual([0, 8])
      expect(findMatch('Planificacion', 'planificación')).toEqual([0, 13])
    })

    it('devuelve el rango en el texto original aunque contenga caracteres compuestos', () => {
      // «é» escrita como «e» + tilde combinante ocupa dos posiciones en el original.
      const text = 'Café solo'
      const match = findMatch(text, 'solo')
      expect(match).toEqual([6, 10])
      const [start, end] = match ?? [0, 0]
      expect(text.slice(start, end)).toBe('solo')
    })

    it('no hace coincidencia difusa con letras no contiguas', () => {
      expect(findMatch('Notificaciones', 'ntf')).toBeNull()
      expect(findMatch('Dashboard', 'dsh')).toBeNull()
    })

    it('una consulta vacía no coincide', () => {
      expect(findMatch('Dashboard', '')).toBeNull()
    })
  })

  describe('filterEntries', () => {
    const entries = [entry('Notificaciones'), entry('Dashboard'), entry('Catálogo')]

    it('devuelve todas las entradas con la consulta vacía o en blanco', () => {
      expect(filterEntries(entries, '')).toEqual(entries)
      expect(filterEntries(entries, '   ')).toEqual(entries)
    })

    it('filtra por subcadena sin tildes ni mayúsculas e ignora espacios en los extremos', () => {
      expect(filterEntries(entries, '  CATALOGO ').map((item) => item.label)).toEqual(['Catálogo'])
      expect(filterEntries(entries, 'notificacion').map((item) => item.label)).toEqual(['Notificaciones'])
    })

    it('no devuelve nada si las letras no son contiguas', () => {
      expect(filterEntries(entries, 'nfc')).toEqual([])
    })
  })

  describe('formatResultCount', () => {
    it('anuncia el recuento en singular, plural o sin resultados', () => {
      expect(formatResultCount(0)).toBe('Sin resultados')
      expect(formatResultCount(1)).toBe('1 resultado')
      expect(formatResultCount(2)).toBe('2 resultados')
      expect(formatResultCount(22)).toBe('22 resultados')
    })
  })

  describe('rutas de clientes', () => {
    it('el detalle va a /users/:id para SUPER_ADMIN y a /clients/:id para ADMIN', () => {
      expect(getClientDetailPath('c1', 'SUPER_ADMIN')).toBe('/users/c1')
      expect(getClientDetailPath('c1', 'ADMIN')).toBe('/clients/c1')
      expect(getClientDetailPath('c1', undefined)).toBe('/clients/c1')
    })

    it('la lista lleva la búsqueda en clientsFilters=q:<texto>', () => {
      expect(getClientsListPath('pro', 'SUPER_ADMIN')).toBe('/users?clientsFilters=q%3Apro')
      expect(getClientsListPath('pro', 'ADMIN')).toBe('/clients?clientsFilters=q%3Apro')
      const path = getClientsListPath('ana maría', 'ADMIN')
      const params = new URLSearchParams(path.split('?')[1])
      expect(path.startsWith('/clients?')).toBe(true)
      expect(params.get('clientsFilters')).toBe('q:ana maría')
    })

    it('sin texto la lista no lleva filtro', () => {
      expect(getClientsListPath('', 'ADMIN')).toBe('/clients')
      expect(getClientsListPath('  ', 'SUPER_ADMIN')).toBe('/users')
    })

    it('la etiqueta de «Ver todos» nombra el destino del rol', () => {
      expect(getClientsListLabel('SUPER_ADMIN')).toBe('Ver todos en Usuarios')
      expect(getClientsListLabel('ADMIN')).toBe('Ver todos en Clientes')
    })
  })

  describe('destinos por rol', () => {
    it.each(['SUPER_ADMIN', 'ADMIN'])('«Ir a» coincide con resolveNavGroups(%s)', (role) => {
      const expected = resolveNavGroups(role).flatMap((group) =>
        group.items.map((item) => ({ to: item.to, label: item.label })),
      )
      expect(getNavigationEntries(role).map(({ to, label }) => ({ to, label }))).toEqual(expected)
    })

    it('ADMIN no tiene Plantillas ni Nueva plantilla y su destino de clientes es /clients', () => {
      const nav = getNavigationEntries('ADMIN')
      const actions = getActionEntries('ADMIN')
      expect(nav.some((item) => item.to === '/notification-templates')).toBe(false)
      expect(actions.some((item) => item.to === '/notification-templates')).toBe(false)
      expect(nav.find((item) => item.label === 'Clientes')?.to).toBe('/clients')
      expect(nav.some((item) => item.label === 'Usuarios')).toBe(false)
    })

    it('SUPER_ADMIN tiene Plantillas, Nueva plantilla y Usuarios', () => {
      const nav = getNavigationEntries('SUPER_ADMIN')
      const actions = getActionEntries('SUPER_ADMIN')
      expect(nav.find((item) => item.label === 'Plantillas')?.to).toBe('/notification-templates')
      expect(actions.find((item) => item.label === 'Nueva plantilla')?.to).toBe('/notification-templates')
      expect(nav.find((item) => item.label === 'Usuarios')?.to).toBe('/users')
      expect(nav.some((item) => item.label === 'Clientes')).toBe(false)
    })

    it('los identificadores de entrada son únicos', () => {
      for (const role of ['SUPER_ADMIN', 'ADMIN']) {
        const ids = [...getNavigationEntries(role), ...getActionEntries(role)].map((item) => item.id)
        expect(new Set(ids).size).toBe(ids.length)
      }
    })
  })
})
