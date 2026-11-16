import { useState } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

function Example({ defaultValue = 'clients' }: { defaultValue?: string }) {
  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList aria-label="Tipo de usuario">
        <TabsTrigger value="clients">Clientes</TabsTrigger>
        <TabsTrigger value="admins">Admins</TabsTrigger>
        <TabsTrigger value="super-admins">Super admins</TabsTrigger>
      </TabsList>
      <TabsContent value="clients">Panel clientes</TabsContent>
      <TabsContent value="admins">Panel admins</TabsContent>
      <TabsContent value="super-admins">Panel super admins</TabsContent>
    </Tabs>
  )
}

function ControlledExample() {
  const [value, setValue] = useState('clients')
  return (
    <>
      <button type="button" onClick={() => setValue('admins')}>
        Ir a admins
      </button>
      <Tabs value={value} onValueChange={setValue}>
        <TabsList aria-label="Tipo de usuario">
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
        </TabsList>
        <TabsContent value="clients">Panel clientes</TabsContent>
        <TabsContent value="admins">Panel admins</TabsContent>
      </Tabs>
    </>
  )
}

describe('Tabs', () => {
  it('renders without throwing in jsdom, even without ResizeObserver', () => {
    const original = globalThis.ResizeObserver
    // jsdom has no layout; make sure the indicator code also survives a missing ResizeObserver.
    Reflect.deleteProperty(globalThis, 'ResizeObserver')
    try {
      expect(() => render(<Example />)).not.toThrow()
    } finally {
      if (original) globalThis.ResizeObserver = original
    }
  })

  it('exposes tablist, tab and tabpanel roles with accessible names', () => {
    render(<Example />)

    expect(screen.getByRole('tablist', { name: 'Tipo de usuario' })).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Clientes', 'Admins', 'Super admins'])
    expect(screen.getByRole('tab', { name: 'Clientes' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Admins' })).toHaveAttribute('aria-selected', 'false')

    const panel = screen.getByRole('tabpanel', { name: 'Clientes' })
    expect(panel).toHaveTextContent('Panel clientes')
  })

  it('moves focus and activates tabs with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<Example />)

    await user.click(screen.getByRole('tab', { name: 'Clientes' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Admins' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Admins' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Admins' })).toHaveTextContent('Panel admins')

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Super admins' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Super admins' })).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps the indicator out of the accessibility tree', () => {
    render(<Example />)
    const list = screen.getByRole('tablist')
    const decorative = list.querySelectorAll('[data-slot="tabs-indicator"]')
    expect(decorative).toHaveLength(1)
    expect(decorative[0]).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('follows a value changed from outside (controlled)', async () => {
    const user = userEvent.setup()
    render(<ControlledExample />)

    await user.click(screen.getByRole('button', { name: 'Ir a admins' }))
    await act(async () => {})
    expect(screen.getByRole('tab', { name: 'Admins' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Admins' })).toHaveTextContent('Panel admins')
  })
})
