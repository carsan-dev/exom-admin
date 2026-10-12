import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CompletionModeField } from './completion-mode-field'
import { COMPLETION_MODE_HELP, isCompletionModeVisible, resolveCompletionModeForSubmit } from './completion-mode'

describe('completion mode submit rules', () => {
  it('shows the field only with more than one training on a non-rest day', () => {
    expect(isCompletionModeVisible(['a'], false)).toBe(false)
    expect(isCompletionModeVisible([], false)).toBe(false)
    expect(isCompletionModeVisible(undefined, false)).toBe(false)
    expect(isCompletionModeVisible(['a', 'b'], true)).toBe(false)
    expect(isCompletionModeVisible(['a', 'b'], false)).toBe(true)
  })
  it('sends the mode only when the field is shown', () => {
    expect(resolveCompletionModeForSubmit(['a'], false, 'ANY')).toBeUndefined()
    expect(resolveCompletionModeForSubmit(['a', 'b'], true, 'ANY')).toBeUndefined()
    expect(resolveCompletionModeForSubmit(['a', 'b'], false, 'ANY')).toBe('ANY')
    expect(resolveCompletionModeForSubmit(['a', 'b'], false, undefined)).toBe('ALL')
  })
})

describe('CompletionModeField', () => {
  it('offers both options with helper text and reports changes', () => {
    const onChange = vi.fn()
    render(<CompletionModeField id="m" value="ALL" onChange={onChange} />)
    expect(screen.getByText('Modo de completado')).toBeInTheDocument()
    expect(screen.getByText(COMPLETION_MODE_HELP)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completar todos' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Elegir uno' }))
    expect(onChange).toHaveBeenCalledWith('ANY')
  })
})
