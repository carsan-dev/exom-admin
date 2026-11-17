import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initTheme, useTheme } from './use-theme'

function getMeta() {
  return document.querySelector('meta[name="theme-color"]')
}

describe('useTheme theme-color meta', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="theme-color" content="#101111" />'
    document.documentElement.className = 'dark'
    localStorage.clear()
    useTheme.setState({ theme: 'dark' })
  })

  afterEach(() => {
    document.head.innerHTML = ''
    document.documentElement.className = ''
    localStorage.clear()
  })

  it('actualiza theme-color al pasar a claro y volver a oscuro', () => {
    useTheme.getState().setTheme('light')
    expect(getMeta()).toHaveAttribute('content', '#f2f1e9')
    expect(document.documentElement).toHaveClass('light')
    expect(localStorage.getItem('exom-admin-theme')).toBe('light')

    useTheme.getState().toggle()
    expect(getMeta()).toHaveAttribute('content', '#101111')
    expect(localStorage.getItem('exom-admin-theme')).toBe('dark')
  })

  it('aplica el color del tema guardado al iniciar', () => {
    localStorage.setItem('exom-admin-theme', 'light')
    initTheme()
    expect(getMeta()).toHaveAttribute('content', '#f2f1e9')
    expect(useTheme.getState().theme).toBe('light')
  })

  it('no falla si no existe la etiqueta theme-color', () => {
    document.head.innerHTML = ''
    expect(() => useTheme.getState().setTheme('light')).not.toThrow()
  })
})
