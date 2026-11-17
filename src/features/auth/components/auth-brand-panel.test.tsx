import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthBrandPanel } from './auth-brand-panel'

describe('AuthBrandPanel', () => {
  it('renderiza la marca EXOM sólida, sin opacidad, con la X en lima', () => {
    render(<AuthBrandPanel />)

    const wordmark = screen.getByTestId('auth-wordmark')
    expect(wordmark).toHaveTextContent('EXOM')
    expect(wordmark.className).toContain('text-[#f2f1e9]')

    const classes = [wordmark, ...Array.from(wordmark.querySelectorAll('*'))]
      .map((el) => el.getAttribute('class') ?? '')
      .join(' ')
    expect(classes).not.toMatch(/text-\[[^\]]*\]\/\d+/)
    expect(classes).not.toMatch(/\/10\b/)

    const letters = Array.from(wordmark.querySelectorAll('.auth-letter'))
    expect(letters.map((l) => l.textContent)).toEqual(['E', 'X', 'O', 'M'])
    letters.forEach((letter) => {
      expect(letter.className.includes('text-brand-primary')).toBe(letter.textContent === 'X')
    })
  })

  it('mantiene el texto accesible del panel', () => {
    render(<AuthBrandPanel />)

    expect(screen.getByText('Panel de administración EXOM')).toBeInTheDocument()
  })
})
