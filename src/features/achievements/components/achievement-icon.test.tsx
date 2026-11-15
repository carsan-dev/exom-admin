import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AchievementIcon } from './achievement-icon'

describe('AchievementIcon', () => {
  it('renders a lazy, async, fixed-size image with a descriptive alt', () => {
    render(<AchievementIcon name="Racha de hierro" url="https://media.example.test/i.png" />)
    const img = screen.getByRole('img', { name: 'Icono de Racha de hierro' })
    expect(img).toHaveAttribute('src', 'https://media.example.test/i.png')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('decoding', 'async')
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(img).toHaveAttribute('width', '36')
    expect(img).toHaveAttribute('height', '36')
  })

  it.each([null, ''])('shows a neutral fallback when the URL is %j', (url) => {
    render(<AchievementIcon name="Racha de hierro" url={url} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    const fallback = screen.getByTestId('achievement-icon-fallback')
    expect(fallback.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('swaps to the fallback when the image fails and retries a new URL', () => {
    const { rerender } = render(<AchievementIcon name="Racha de hierro" url="https://media.example.test/a.png" />)
    fireEvent.error(screen.getByRole('img', { name: 'Icono de Racha de hierro' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('achievement-icon-fallback')).toBeInTheDocument()

    rerender(<AchievementIcon name="Racha de hierro" url="https://media.example.test/b.png" />)
    expect(screen.getByRole('img', { name: 'Icono de Racha de hierro' })).toHaveAttribute(
      'src',
      'https://media.example.test/b.png',
    )
  })
})
