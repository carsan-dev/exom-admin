import { useState } from 'react'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './confirm-dialog'
import { useConfirmDialog, type ConfirmDialogOptions } from './use-confirm-dialog'

const QUESTION = '¿Seguro que quieres continuar?'

/** Renders a trigger that asks once and records the answer, plus what runs only on acceptance. */
function Harness({
  options = { title: QUESTION },
  onAnswer,
  onAccepted,
}: {
  options?: ConfirmDialogOptions
  onAnswer: (answer: boolean) => void
  onAccepted?: () => void
}) {
  const { confirm, dialog } = useConfirmDialog()
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const accepted = await confirm(options)
          onAnswer(accepted)
          if (accepted) onAccepted?.()
        }}
      >
        Abrir
      </button>
      {dialog}
    </>
  )
}

describe('ConfirmDialog', () => {
  it('renders an alertdialog named by the question with the default labels', () => {
    render(<ConfirmDialog open title={QUESTION} onConfirm={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByRole('alertdialog', { name: QUESTION })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('calls exactly one callback per answer path', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { rerender } = render(<ConfirmDialog open title={QUESTION} onConfirm={onConfirm} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    rerender(<ConfirmDialog open title={QUESTION} onConfirm={onConfirm} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('renders the description, custom labels and the destructive variant', () => {
    render(
      <ConfirmDialog
        open
        title={QUESTION}
        description="Detalle adicional"
        confirmLabel="Eliminar"
        cancelLabel="Volver"
        destructive
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const dialog = screen.getByRole('alertdialog', { name: QUESTION })
    expect(dialog).toHaveAccessibleDescription('Detalle adicional')
    const confirmButton = screen.getByRole('button', { name: 'Eliminar' })
    expect(confirmButton).toHaveClass('bg-destructive')
    expect(confirmButton).not.toHaveClass('bg-primary')
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })

  it('uses the default button variant when not destructive', () => {
    render(<ConfirmDialog open title={QUESTION} onConfirm={vi.fn()} onCancel={vi.fn()} />)

    const confirmButton = screen.getByRole('button', { name: 'Aceptar' })
    expect(confirmButton).toHaveClass('bg-primary')
    expect(confirmButton).not.toHaveClass('bg-destructive')
  })
})

describe('useConfirmDialog', () => {
  it('resolves true on accept and removes the dialog afterwards', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    const onAccepted = vi.fn()
    render(<Harness onAnswer={onAnswer} onAccepted={onAccepted} />)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(screen.getByRole('alertdialog', { name: QUESTION })).toBeInTheDocument()
    expect(onAnswer).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Aceptar' }))

    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(true))
    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAccepted).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('resolves false on cancel and runs nothing else', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    const onAccepted = vi.fn()
    render(<Harness onAnswer={onAnswer} onAccepted={onAccepted} />)

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(false))
    expect(onAccepted).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('resolves false on Escape', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    const onAccepted = vi.fn()
    render(<Harness onAnswer={onAnswer} onAccepted={onAccepted} />)

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.keyboard('{Escape}')

    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(false))
    expect(onAccepted).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('focuses cancel first so Enter does not accept by accident', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    const onAccepted = vi.fn()
    render(<Harness onAnswer={onAnswer} onAccepted={onAccepted} />)

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus())

    await user.keyboard('{Enter}')
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(false))
    expect(onAccepted).not.toHaveBeenCalled()
  })

  it('accepts with the keyboard: Tab to the confirm button, then Enter', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    const onAccepted = vi.fn()
    render(<Harness onAnswer={onAnswer} onAccepted={onAccepted} />)

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus())
    await user.tab()
    expect(screen.getByRole('button', { name: 'Aceptar' })).toHaveFocus()
    await user.keyboard('{Enter}')

    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(true))
    expect(onAccepted).toHaveBeenCalledTimes(1)
  })

  it('passes destructive options through to the dialog', async () => {
    const user = userEvent.setup()
    render(
      <Harness
        options={{ title: QUESTION, confirmLabel: 'Eliminar', destructive: true }}
        onAnswer={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(screen.getByRole('button', { name: 'Eliminar' })).toHaveClass('bg-destructive')
  })

  it('resolves false when the host unmounts while pending and runs nothing afterwards', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    const onAccepted = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    function Host() {
      const [mounted, setMounted] = useState(true)
      return (
        <>
          <button type="button" onClick={() => setMounted(false)}>Desmontar</button>
          {mounted ? <Harness onAnswer={onAnswer} onAccepted={onAccepted} /> : null}
        </>
      )
    }

    render(<Host />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(screen.getByRole('alertdialog', { name: QUESTION })).toBeInTheDocument()

    // The modal blocks pointer interaction outside, so unmount programmatically.
    act(() => {
      screen.getByRole('button', { name: 'Desmontar', hidden: true }).click()
    })

    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(false))
    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAccepted).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('resolves false at once when asked after the host unmounted', async () => {
    const { result, unmount } = renderHook(() => useConfirmDialog())
    const { confirm } = result.current
    unmount()

    await expect(confirm({ title: QUESTION })).resolves.toBe(false)
  })

  it('resolves a second confirm immediately as false and keeps the first one pending', async () => {
    const { result } = renderHook(() => useConfirmDialog())
    const answers: string[] = []

    let first: Promise<boolean> = Promise.resolve(false)
    let second: Promise<boolean> = Promise.resolve(true)
    act(() => {
      first = result.current.confirm({ title: 'Primera' })
      second = result.current.confirm({ title: 'Segunda' })
    })
    void first.then((value) => answers.push(`first:${value}`))

    await expect(second).resolves.toBe(false)
    expect(answers).toEqual([])

    render(<>{result.current.dialog}</>)
    expect(screen.getByRole('alertdialog', { name: 'Primera' })).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog', { name: 'Segunda' })).not.toBeInTheDocument()
  })

  it('answers only the pending question once even if both buttons fire', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<Harness onAnswer={onAnswer} />)

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    const accept = screen.getByRole('button', { name: 'Aceptar' })
    const cancel = screen.getByRole('button', { name: 'Cancelar' })
    act(() => {
      accept.click()
      cancel.click()
    })

    await waitFor(() => expect(onAnswer).toHaveBeenCalledTimes(1))
    expect(onAnswer).toHaveBeenCalledWith(true)
  })

  it('keeps a stable confirm identity across renders and open state', () => {
    const { result, rerender } = renderHook(() => useConfirmDialog())
    const initial = result.current.confirm

    rerender()
    expect(result.current.confirm).toBe(initial)

    act(() => {
      void result.current.confirm({ title: QUESTION })
    })
    expect(result.current.confirm).toBe(initial)
  })

  it('can ask again after an answer', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    render(<Harness onAnswer={onAnswer} />)

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(screen.getByRole('button', { name: 'Aceptar' }))

    await waitFor(() => expect(onAnswer).toHaveBeenNthCalledWith(2, true))
    expect(onAnswer).toHaveBeenNthCalledWith(1, false)
  })
})
