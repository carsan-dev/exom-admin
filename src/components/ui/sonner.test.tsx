import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Toaster } from './sonner'

vi.mock('sonner', () => ({
  Toaster: ({ className }: { className?: string }) => <div data-testid="toaster" className={className} />,
}))

describe('Toaster', () => {
  it('remains visible on mobile viewports', () => {
    render(<Toaster />)
    const toaster = screen.getByTestId('toaster')

    expect(toaster).toHaveClass('toaster', 'group')
    expect(toaster).not.toHaveClass('hidden')
  })
})
