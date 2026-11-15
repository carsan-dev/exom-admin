import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExerciseThumbnail } from './exercise-thumbnail'

describe('ExerciseThumbnail', () => {
  it('renders a lazy, async, fixed-size image with a descriptive alt', () => {
    render(<ExerciseThumbnail name="Sentadilla" url="https://media.example.test/s.jpg" />)
    const img = screen.getByRole('img', { name: 'Miniatura de Sentadilla' })
    expect(img).toHaveAttribute('src', 'https://media.example.test/s.jpg')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('decoding', 'async')
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(img).toHaveAttribute('width', '48')
    expect(img).toHaveAttribute('height', '36')
    expect(img).toHaveClass('object-cover')
  })

  it('shows a neutral fallback without image when the URL is null', () => {
    render(<ExerciseThumbnail name="Sentadilla" url={null} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    const fallback = screen.getByTestId('exercise-thumbnail-fallback')
    expect(fallback.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('swaps to the fallback when the image fails and retries a new URL', () => {
    const { rerender } = render(<ExerciseThumbnail name="Sentadilla" url="https://media.example.test/a.jpg" />)
    fireEvent.error(screen.getByRole('img', { name: 'Miniatura de Sentadilla' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('exercise-thumbnail-fallback')).toBeInTheDocument()

    rerender(<ExerciseThumbnail name="Sentadilla" url="https://media.example.test/b.jpg" />)
    expect(screen.getByRole('img', { name: 'Miniatura de Sentadilla' })).toHaveAttribute(
      'src',
      'https://media.example.test/b.jpg',
    )
  })
})
