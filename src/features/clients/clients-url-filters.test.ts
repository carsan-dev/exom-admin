import { describe, expect, it } from 'vitest'
import type { FilterSectionConfig } from '@/components/filters'
import { decodeClientsUrlFilters, encodeClientsUrlFilters } from './clients-url-filters'

const sections: FilterSectionConfig[] = [
  {
    type: 'multi',
    key: 'status',
    label: 'Estado',
    options: [
      { value: 'ACTIVE', label: 'Activa' },
      { value: 'LOCKED', label: 'Bloqueada' },
    ],
  },
  { type: 'multi', key: 'tags', label: 'Etiquetas' },
  { type: 'date-range', key: 'created', label: 'Fecha registro' },
  { type: 'range', key: 'age', label: 'Edad', min: 0, max: 100 },
]

describe('clients URL filters codec', () => {
  it('encodes nothing when there is no search and no filters', () => {
    expect(encodeClientsUrlFilters({ search: '', values: {} }, sections)).toBe('')
    expect(encodeClientsUrlFilters({ search: '   ', values: { status: [] } }, sections)).toBe('')
    expect(decodeClientsUrlFilters('', sections)).toEqual({ search: '', values: {} })
    expect(decodeClientsUrlFilters(null, sections)).toEqual({ search: '', values: {} })
  })

  it('uses a stable, readable format in section order', () => {
    const encoded = encodeClientsUrlFilters(
      {
        search: 'ana',
        values: { created: ['2026-01-01', null], status: ['LOCKED', 'ACTIVE'], age: [null, 40] },
      },
      sections,
    )

    expect(encoded).toBe('q:ana;status:LOCKED,ACTIVE;created:2026-01-01~;age:~40')
  })

  it('round-trips special characters, spaces and delimiters', () => {
    const state = {
      search: '  María & José = 100% : a,b;c~d + e/f?  ',
      values: {
        status: ['ACTIVE'],
        tags: ['a,b', 'x:y;z', '50%~'],
        created: ['2026-01-01', '2026-02-28'] as [string, string],
        age: [18, 65] as [number, number],
      },
    }
    const encoded = encodeClientsUrlFilters(state, sections)

    expect(decodeClientsUrlFilters(encoded, sections)).toEqual(state)

    const outer = new URLSearchParams()
    outer.set('clientsFilters', encoded)
    const reparsed = new URLSearchParams(outer.toString()).get('clientsFilters')

    expect(decodeClientsUrlFilters(reparsed, sections)).toEqual(state)
  })

  it('ignores unknown keys, unknown options and invalid values without throwing', () => {
    const decoded = decodeClientsUrlFilters(
      'q:%E0%A4%A;status:ACTIVE,NOPE,ACTIVE;created:2026-13~nope;age:x~5;other:1;;garbage;:x',
      sections,
    )

    expect(decoded).toEqual({ search: '', values: { status: ['ACTIVE'] } })
    expect(decodeClientsUrlFilters('age:~5;created:~2026-02-01', sections).values).toEqual({
      age: [null, 5],
      created: [null, '2026-02-01'],
    })
  })

  it('drops a section that is not configured for the current role', () => {
    const adminSections = sections.filter((section) => section.key !== 'status')

    expect(decodeClientsUrlFilters('q:bea;status:ACTIVE', adminSections)).toEqual({
      search: 'bea',
      values: {},
    })
  })

  it('never throws on arbitrary input', () => {
    for (const raw of ['%', ':', ';;;', 'q:%', 'created:~', 'created:~~', 'status:', '\u0000', 'q:a:b']) {
      expect(() => decodeClientsUrlFilters(raw, sections)).not.toThrow()
    }
    expect(decodeClientsUrlFilters('q:a:b', sections).search).toBe('')
  })
})
