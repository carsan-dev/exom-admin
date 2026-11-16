import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NotificationTemplate } from '../types'
import { CreateTemplateDialog } from './create-template-dialog'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('sonner', () => ({ toast }))

const created: NotificationTemplate = {
  key: 'manual-nueva',
  name: 'Aviso',
  description: '',
  category: 'Manual',
  title: 'Hola',
  body: 'Texto',
  route: null,
  enabled: true,
  variables: [],
  variable_help: {},
  delivery_info: { type: 'manual', label: 'Manual', description: 'Se envía desde el historial' },
  customized: false,
  is_system: false,
  updated_at: null,
}

beforeEach(() => {
  api.post.mockReset()
  toast.success.mockReset()
  toast.error.mockReset()
  api.post.mockResolvedValue({ data: { data: created } })
})

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const onCreated = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <CreateTemplateDialog open onOpenChange={vi.fn()} onCreated={onCreated} />
    </QueryClientProvider>,
  )
  return { onCreated }
}

const field = (name: string) => screen.getByRole('textbox', { name })

describe('CreateTemplateDialog: campos obligatorios (RDS-F5-A11Y-15)', () => {
  it('marca nombre, título y cuerpo como obligatorios y el resto como opcionales', () => {
    mount()
    expect(field('Nombre')).toBeRequired()
    expect(field('Título')).toBeRequired()
    expect(field('Cuerpo')).toBeRequired()
    expect(field('Categoría')).not.toBeRequired()
    expect(field('Descripción')).not.toBeRequired()
    expect(field('Ruta')).not.toBeRequired()
    for (const name of ['Nombre', 'Título', 'Cuerpo']) {
      expect(field(name)).not.toHaveAttribute('required')
    }
  })
})

describe('CreateTemplateDialog: errores en línea (RDS-F5-A11Y-05)', () => {
  it('al enviar vacío marca los campos inválidos, los describe, enfoca el primero y no llama a la API', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(screen.getByRole('button', { name: 'Crear plantilla' }))

    expect(toast.error).toHaveBeenCalledWith('El nombre es obligatorio')
    expect(api.post).not.toHaveBeenCalled()

    expect(field('Nombre')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Nombre')).toHaveAccessibleDescription('El nombre es obligatorio')
    expect(field('Título')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Título')).toHaveAccessibleDescription('El título es obligatorio')
    expect(field('Cuerpo')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Cuerpo')).toHaveAccessibleDescription('El cuerpo es obligatorio')
    expect(field('Ruta')).not.toHaveAttribute('aria-invalid', 'true')
    expect(field('Nombre')).toHaveFocus()
  })

  it('una ruta sin barra muestra el mismo texto que el toast y se limpia al corregirla', async () => {
    const user = userEvent.setup()
    mount()

    await user.type(field('Nombre'), 'Aviso')
    await user.type(field('Título'), 'Hola')
    await user.type(field('Cuerpo'), 'Texto')
    await user.type(field('Ruta'), 'recap')
    await user.click(screen.getByRole('button', { name: 'Crear plantilla' }))

    expect(toast.error).toHaveBeenCalledWith('La ruta debe empezar por / o quedar vacía')
    expect(api.post).not.toHaveBeenCalled()
    expect(field('Ruta')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Ruta')).toHaveAccessibleDescription('La ruta debe empezar por / o quedar vacía')
    expect(field('Ruta')).toHaveFocus()
    expect(field('Nombre')).not.toHaveAttribute('aria-invalid', 'true')

    await user.clear(field('Ruta'))
    await user.type(field('Ruta'), '/recap')
    expect(field('Ruta')).not.toHaveAttribute('aria-invalid', 'true')
    expect(field('Ruta')).not.toHaveAccessibleDescription()
    expect(screen.queryByText('La ruta debe empezar por / o quedar vacía')).not.toBeInTheDocument()
  })

  it('corregir un campo limpia solo su error', async () => {
    const user = userEvent.setup()
    mount()

    await user.click(screen.getByRole('button', { name: 'Crear plantilla' }))
    await user.type(field('Nombre'), 'Aviso')

    expect(field('Nombre')).not.toHaveAttribute('aria-invalid', 'true')
    expect(field('Nombre')).not.toHaveAccessibleDescription()
    expect(field('Título')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Cuerpo')).toHaveAttribute('aria-invalid', 'true')
  })

  it('con datos válidos envía el mismo payload de siempre', async () => {
    const user = userEvent.setup()
    const { onCreated } = mount()

    await user.click(screen.getByRole('button', { name: 'Crear plantilla' }))
    await user.type(field('Nombre'), '  Aviso  ')
    await user.type(field('Título'), ' Hola ')
    await user.type(field('Cuerpo'), ' Texto ')
    await user.click(screen.getByRole('button', { name: 'Crear plantilla' }))

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    expect(api.post).toHaveBeenCalledWith('/notifications/templates', {
      name: 'Aviso',
      description: undefined,
      category: 'Manual',
      title: 'Hola',
      body: 'Texto',
      route: null,
      enabled: true,
    })
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created))
    expect(toast.success).toHaveBeenCalledWith('Plantilla creada')
  })
})
