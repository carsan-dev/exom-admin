import { createRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from './segmented'

type View = 'main' | 'archived' | 'drafts'
const options: { value: View; label: string; disabled?: boolean }[] = [
  { value: 'main', label: 'Principal' },
  { value: 'archived', label: 'Archivados' },
  { value: 'drafts', label: 'Borradores' },
]

describe('SegmentedControl', () => {
  it('is a group named by aria-label with buttons using aria-pressed', () => {
    render(
      <SegmentedControl
        aria-label="Visibilidad"
        value="main"
        options={options}
      />
    )
    expect(screen.getByRole('group', { name: 'Visibilidad' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Principal' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Archivados' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('supports aria-labelledby for the group name', () => {
    render(
      <>
        <span id="lbl">Vista</span>
        <SegmentedControl
          aria-labelledby="lbl"
          value="main"
          options={options}
        />
      </>
    )
    expect(screen.getByRole('group', { name: 'Vista' })).toBeInTheDocument()
  })

  it('calls onValueChange on click and only for a different option', async () => {
    const onValueChange = vi.fn()
    render(
      <SegmentedControl
        aria-label="g"
        value="main"
        options={options}
        onValueChange={onValueChange}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Principal' }))
    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Archivados' }))
    expect(onValueChange).toHaveBeenCalledWith('archived')
  })

  it('moves with Tab and selects with Space and Enter', async () => {
    function Controlled() {
      const [value, setValue] = useState<View>('main')
      return (
        <SegmentedControl
          aria-label="g"
          value={value}
          onValueChange={setValue}
          options={options}
        />
      )
    }
    render(<Controlled />)
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Principal' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Archivados' })).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Archivados' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Principal' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Borradores' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('does not change selection when the parent does not update value', async () => {
    render(
      <SegmentedControl
        aria-label="g"
        value="main"
        options={options}
        onValueChange={() => {}}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Archivados' }))
    expect(screen.getByRole('button', { name: 'Principal' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('does not fire for a disabled option', async () => {
    const onValueChange = vi.fn()
    render(
      <SegmentedControl
        aria-label="g"
        value="main"
        onValueChange={onValueChange}
        options={[
          { value: 'main', label: 'Principal' },
          { value: 'archived', label: 'Archivados', disabled: true },
        ]}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Archivados' }))
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Archivados' })).toBeDisabled()
  })

  it('does not fire when the whole control is disabled', async () => {
    const onValueChange = vi.fn()
    render(
      <SegmentedControl
        aria-label="g"
        value="main"
        disabled
        onValueChange={onValueChange}
        options={options}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Archivados' }))
    expect(onValueChange).not.toHaveBeenCalled()
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })

  it('marks the selected segment beyond tint (accent border and fill)', () => {
    render(<SegmentedControl aria-label="g" value="main" options={options} />)
    const selected = screen.getByRole('button', { name: 'Principal' })
    expect(selected).toHaveClass('border-accent-line', 'bg-primary')
    expect(screen.getByRole('button', { name: 'Archivados' })).not.toHaveClass(
      'bg-primary'
    )
  })

  it('applies size sm', () => {
    render(
      <SegmentedControl aria-label="g" value="main" options={options} size="sm" />
    )
    expect(screen.getByRole('button', { name: 'Principal' })).toHaveClass('h-6')
  })

  it('merges className and forwards ref to the group', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <SegmentedControl
        aria-label="g"
        className="custom-x"
        ref={ref}
        value="main"
        options={options}
      />
    )
    const group = screen.getByRole('group')
    expect(group).toHaveClass('custom-x', 'rounded-full')
    expect(ref.current).toBe(group)
  })
})
