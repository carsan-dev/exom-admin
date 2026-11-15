import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn (tailwind-merge v3 con Tailwind 4)', () => {
  it('deduplica utilidades size-*', () => {
    expect(cn('size-4', 'size-6')).toBe('size-6')
    expect(cn('size-4', 'h-8')).toBe('size-4 h-8')
  })

  it('deduplica la escala de sombras de Tailwind 4', () => {
    expect(cn('shadow-xs', 'shadow-sm')).toBe('shadow-sm')
    expect(cn('shadow-2xs', 'shadow-xl')).toBe('shadow-xl')
  })

  it('deduplica la escala de radios de Tailwind 4', () => {
    expect(cn('rounded-xs', 'rounded-sm')).toBe('rounded-sm')
    expect(cn('rounded-md', 'rounded-4xl')).toBe('rounded-4xl')
  })

  it('resuelve la sintaxis de variable arbitraria bg-(--x)', () => {
    expect(cn('bg-card', 'bg-(--x)')).toBe('bg-(--x)')
    expect(cn('bg-(--x)', 'bg-card')).toBe('bg-card')
  })

  it('resuelve conflictos entre clases de color de tokens del proyecto', () => {
    expect(cn('text-muted-foreground', 'text-accent-text')).toBe('text-accent-text')
    expect(cn('border-border', 'border-control-border')).toBe('border-control-border')
    expect(cn('bg-card', 'bg-status-success-soft')).toBe('bg-status-success-soft')
  })

  it('no confunde tamaño de texto con color de texto', () => {
    expect(cn('text-sm', 'text-accent-text')).toBe('text-sm text-accent-text')
    expect(cn('text-accent-text', 'text-sm')).toBe('text-accent-text text-sm')
  })

  it('conserva clases condicionales de clsx', () => {
    expect(cn('p-2', { 'p-4': false }, ['m-1', { 'm-2': true }])).toBe('p-2 m-2')
  })
})
