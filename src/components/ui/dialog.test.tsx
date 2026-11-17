import { useState } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from './sheet'

// Radix (react-remove-scroll-bar) locks page scroll with a counted `data-scroll-locked`
// attribute on <body> plus an injected `body[data-scroll-locked] { overflow: hidden
// !important }` rule; jsdom cascades that rule into getComputedStyle. These helpers
// assert the effective lock, not one particular mechanism.
function expectPageScrollLocked() {
  expect(document.body).toHaveAttribute('data-scroll-locked')
  expect(getComputedStyle(document.body).overflow).toBe('hidden')
}

function expectPageScrollReleased() {
  expect(document.body).not.toHaveAttribute('data-scroll-locked')
  expect(getComputedStyle(document.body).overflow).not.toBe('hidden')
  expect(document.body.style.overflow).toBe('')
  expect(document.body.style.pointerEvents).toBe('')
}

function OuterActions() {
  const [clicks, setClicks] = useState(0)
  return (
    <button type="button" onClick={() => setClicks((value) => value + 1)}>
      Acción exterior {clicks}
    </button>
  )
}

describe('nested modals keep the page scroll-locked until the last one closes (RDS-F2-08)', () => {
  it('Dialog inside Dialog', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger>Abrir exterior</DialogTrigger>
        <DialogContent>
          <DialogTitle>Exterior</DialogTitle>
          <DialogDescription>Diálogo exterior</DialogDescription>
          <OuterActions />
          <Dialog>
            <DialogTrigger>Abrir interior</DialogTrigger>
            <DialogContent>
              <DialogTitle>Interior</DialogTitle>
              <DialogDescription>Diálogo interior</DialogDescription>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>,
    )

    await user.click(screen.getByRole('button', { name: 'Abrir exterior' }))
    expectPageScrollLocked()
    await user.click(screen.getByRole('button', { name: 'Abrir interior' }))
    expect(screen.getByRole('dialog', { name: 'Interior' })).toBeInTheDocument()
    expectPageScrollLocked()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Interior' })).not.toBeInTheDocument()
    const outer = screen.getByRole('dialog', { name: 'Exterior' })
    expect(outer).toHaveAttribute('data-state', 'open')
    expect(screen.getByRole('button', { name: 'Abrir interior' })).toHaveFocus()
    expectPageScrollLocked()
    await user.click(within(outer).getByRole('button', { name: 'Acción exterior 0' }))
    expect(within(outer).getByRole('button', { name: 'Acción exterior 1' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expectPageScrollReleased()
  })

  it('AlertDialog inside Dialog', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger>Abrir exterior</DialogTrigger>
        <DialogContent disableOutsideClose>
          <DialogTitle>Formulario</DialogTitle>
          <DialogDescription>Diálogo exterior</DialogDescription>
          <OuterActions />
          <AlertDialog>
            <AlertDialogTrigger>Descartar cambios</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>¿Descartar?</AlertDialogTitle>
              <AlertDialogDescription>Perderás los cambios.</AlertDialogDescription>
              <AlertDialogCancel>Seguir editando</AlertDialogCancel>
              <AlertDialogAction>Descartar</AlertDialogAction>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>,
    )

    await user.click(screen.getByRole('button', { name: 'Abrir exterior' }))
    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.getByRole('alertdialog', { name: '¿Descartar?' })).toBeInTheDocument()
    expectPageScrollLocked()

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    const outer = screen.getByRole('dialog', { name: 'Formulario' })
    expect(outer).toHaveAttribute('data-state', 'open')
    expectPageScrollLocked()
    await user.click(within(outer).getByRole('button', { name: 'Acción exterior 0' }))
    expect(within(outer).getByRole('button', { name: 'Acción exterior 1' })).toBeInTheDocument()

    await user.click(within(outer).getByRole('button', { name: 'Cerrar diálogo' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expectPageScrollReleased()
  })

  it('Dialog inside Sheet', async () => {
    const user = userEvent.setup()
    render(
      <Sheet>
        <SheetTrigger>Abrir panel</SheetTrigger>
        <SheetContent>
          <SheetTitle>Panel</SheetTitle>
          <SheetDescription>Panel lateral</SheetDescription>
          <OuterActions />
          <Dialog>
            <DialogTrigger>Abrir interior</DialogTrigger>
            <DialogContent>
              <DialogTitle>Interior</DialogTitle>
              <DialogDescription>Diálogo interior</DialogDescription>
            </DialogContent>
          </Dialog>
        </SheetContent>
      </Sheet>,
    )

    await user.click(screen.getByRole('button', { name: 'Abrir panel' }))
    await user.click(screen.getByRole('button', { name: 'Abrir interior' }))
    expectPageScrollLocked()

    await user.click(
      within(screen.getByRole('dialog', { name: 'Interior' })).getByRole('button', { name: 'Cerrar diálogo' }),
    )

    expect(screen.queryByRole('dialog', { name: 'Interior' })).not.toBeInTheDocument()
    const outer = screen.getByRole('dialog', { name: 'Panel' })
    expect(outer).toHaveAttribute('data-state', 'open')
    expectPageScrollLocked()
    await user.click(within(outer).getByRole('button', { name: 'Acción exterior 0' }))
    expect(within(outer).getByRole('button', { name: 'Acción exterior 1' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expectPageScrollReleased()
  })
})

// jsdom runs no CSS animations, so Radix Presence sees `animationName: none` and
// unmounts synchronously. To exercise the exit path, report a live animation name for
// elements carrying the overlay animation utilities, derived from their data-state the
// way the real stylesheet does, and dispatch `animationend` by hand.
function simulateOverlayAnimations() {
  const realGetComputedStyle = window.getComputedStyle.bind(window)
  return vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const styles = realGetComputedStyle(element, pseudo)
    const isScrim = element.classList.contains('anim-overlay-scrim')
    const isPanel = element.classList.contains('anim-overlay-panel')
    if (!isScrim && !isPanel) return styles
    return new Proxy(styles, {
      get(target, property) {
        if (property === 'animationName') {
          const closing = element.getAttribute('data-state') === 'closed'
          if (isScrim) return closing ? 'overlay-fade-out' : 'overlay-fade-in'
          return closing ? 'overlay-rise-out' : 'overlay-rise-in'
        }
        const value: unknown = Reflect.get(target, property, target)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
  })
}

function finishAnimation(element: Element, animationName: string) {
  const event = new Event('animationend', { bubbles: true })
  Object.defineProperty(event, 'animationName', { value: animationName })
  act(() => {
    element.dispatchEvent(event)
  })
}

const overlayCases = [
  {
    name: 'Dialog',
    role: 'dialog' as const,
    overlaySelector: '[data-slot="dialog-overlay"]',
    ui: (
      <Dialog>
        <DialogTrigger>Abrir</DialogTrigger>
        <DialogContent>
          <DialogTitle>Animado</DialogTitle>
          <DialogDescription>d</DialogDescription>
        </DialogContent>
      </Dialog>
    ),
    close: () => userEvent.click(screen.getByRole('button', { name: 'Cerrar diálogo' })),
  },
  {
    name: 'Sheet',
    role: 'dialog' as const,
    overlaySelector: '[data-slot="sheet-overlay"]',
    ui: (
      <Sheet>
        <SheetTrigger>Abrir</SheetTrigger>
        <SheetContent>
          <SheetTitle>Animado</SheetTitle>
          <SheetDescription>d</SheetDescription>
        </SheetContent>
      </Sheet>
    ),
    close: () => userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' })),
  },
  {
    name: 'AlertDialog',
    role: 'alertdialog' as const,
    overlaySelector: '[data-slot="alert-dialog-overlay"]',
    ui: (
      <AlertDialog>
        <AlertDialogTrigger>Abrir</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Animado</AlertDialogTitle>
          <AlertDialogDescription>d</AlertDialogDescription>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    ),
    close: () => userEvent.click(screen.getByRole('button', { name: 'Cancelar' })),
  },
]

describe('overlay exit animation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each(overlayCases)(
    '$name keeps overlay and content mounted in data-state=closed until animationend',
    async ({ role, overlaySelector, ui, close }) => {
      simulateOverlayAnimations()
      render(ui)

      await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
      const content = screen.getByRole(role, { name: 'Animado' })
      const overlay = document.querySelector(`${overlaySelector}, .anim-overlay-scrim`)
      expect(overlay).toHaveAttribute('data-state', 'open')
      expect(content).toHaveAttribute('data-state', 'open')

      await close()

      expect(content).toBeInTheDocument()
      expect(content).toHaveAttribute('data-state', 'closed')
      expect(overlay).toBeInTheDocument()
      expect(overlay).toHaveAttribute('data-state', 'closed')

      finishAnimation(content, 'overlay-rise-out')
      expect(content).not.toBeInTheDocument()
      expect(overlay).toBeInTheDocument()

      finishAnimation(overlay as Element, 'overlay-fade-out')
      expect(overlay).not.toBeInTheDocument()
      expectPageScrollReleased()
    },
  )

  it.each(overlayCases)(
    '$name unmounts synchronously on close when no animation runs',
    async ({ role, ui, close }) => {
      render(ui)

      await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
      expect(screen.getByRole(role, { name: 'Animado' })).toBeInTheDocument()

      await close()

      expect(screen.queryByRole(role)).not.toBeInTheDocument()
      expectPageScrollReleased()
    },
  )
})

describe('DialogContent disableOutsideClose', () => {
  function renderDialog(props: {
    disableOutsideClose?: boolean
    onInteractOutside?: () => void
    onOpenChange?: (open: boolean) => void
  }) {
    const { onOpenChange, ...contentProps } = props
    render(
      <Dialog onOpenChange={onOpenChange}>
        <DialogTrigger>Abrir</DialogTrigger>
        <DialogContent {...contentProps}>
          <DialogTitle>Formulario</DialogTitle>
          <DialogDescription>d</DialogDescription>
          <input aria-label="Nombre" />
        </DialogContent>
      </Dialog>,
    )
  }

  async function openAndWaitForOutsideListener(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    // DismissableLayer attaches its document pointerdown listener on the next tick.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
  }

  function pointerDownOnScrim() {
    const scrim = document.querySelector('[data-slot="dialog-overlay"], .anim-overlay-scrim')
    expect(scrim).not.toBeNull()
    fireEvent.pointerDown(scrim as Element)
  }

  it('without the prop, a pointer-down on the scrim closes the dialog', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog({ onOpenChange })
    await openAndWaitForOutsideListener(user)

    pointerDownOnScrim()

    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('without the prop, Escape closes the dialog', async () => {
    const user = userEvent.setup()
    renderDialog({})
    await openAndWaitForOutsideListener(user)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('with the prop, a pointer-down on the scrim keeps the dialog open and still notifies onInteractOutside', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onInteractOutside = vi.fn()
    renderDialog({ disableOutsideClose: true, onInteractOutside, onOpenChange })
    await openAndWaitForOutsideListener(user)

    pointerDownOnScrim()

    expect(onInteractOutside).toHaveBeenCalledTimes(1)
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(screen.getByRole('dialog', { name: 'Formulario' })).toHaveAttribute('data-state', 'open')
  })

  it('with the prop, Escape still closes the dialog (only outside interaction is blocked)', async () => {
    const user = userEvent.setup()
    renderDialog({ disableOutsideClose: true })
    await openAndWaitForOutsideListener(user)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
