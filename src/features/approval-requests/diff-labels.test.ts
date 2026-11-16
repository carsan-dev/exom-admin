import { describe, expect, it } from 'vitest'
import { DIFF_FIELD_LABELS, formatDiffValue, getDiffFieldLabel } from './diff-labels'

describe('getDiffFieldLabel', () => {
  it('traduce las claves conocidas', () => {
    expect(getDiffFieldLabel('estimated_duration_min')).toBe('Duración estimada (min)')
    expect(getDiffFieldLabel('protein_g')).toBe('Proteínas (g)')
  })

  it('devuelve la clave tal cual cuando no tiene traducción', () => {
    expect(getDiffFieldLabel('campo_desconocido')).toBe('campo_desconocido')
    expect(getDiffFieldLabel('constructor')).toBe('constructor')
  })

  it('no define etiquetas vacías', () => {
    for (const label of Object.values(DIFF_FIELD_LABELS)) {
      expect(label.trim()).not.toBe('')
    }
  })
})

describe('formatDiffValue', () => {
  it('formatea booleanos como Sí y No', () => {
    expect(formatDiffValue(true)).toBe('Sí')
    expect(formatDiffValue(false)).toBe('No')
  })

  it('muestra un guion para null, undefined y cadena vacía', () => {
    expect(formatDiffValue(null)).toBe('—')
    expect(formatDiffValue(undefined)).toBe('—')
    expect(formatDiffValue('')).toBe('—')
  })

  it('conserva números y textos', () => {
    expect(formatDiffValue(65)).toBe('65')
    expect(formatDiffValue(0)).toBe('0')
    expect(formatDiffValue('Fuerza tren superior')).toBe('Fuerza tren superior')
  })

  it('formatea fechas ISO en hora local', () => {
    const local = new Date(2026, 10, 15, 18, 42).toISOString()
    expect(formatDiffValue(local)).toBe('15/11/2026 18:42')
    expect(formatDiffValue('2026-11-15')).toBe('15/11/2026')
  })

  it('une con comas las listas cortas de primitivos', () => {
    expect(formatDiffValue(['pecho', 'espalda'])).toBe('pecho, espalda')
    expect(formatDiffValue([1, true, null])).toBe('1, Sí, —')
  })

  it('resume listas largas, listas de objetos y objetos', () => {
    expect(formatDiffValue([1, 2, 3, 4, 5, 6])).toBe('6 elementos')
    expect(formatDiffValue([{ a: 1 }])).toBe('1 elemento')
    expect(formatDiffValue({ a: 1, b: 2 })).toBe('2 campos')
    expect(formatDiffValue({ a: 1 })).toBe('1 campo')
  })

  it('muestra un guion para listas y objetos vacíos', () => {
    expect(formatDiffValue([])).toBe('—')
    expect(formatDiffValue({})).toBe('—')
  })
})
