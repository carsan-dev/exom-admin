import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import type { NotificationTemplate } from '../types'
import { NotificationTemplatesPage } from './notification-templates-page'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('sonner', () => ({ toast }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'super' } })) }
})

const manualTemplate: NotificationTemplate = {
  key: 'manual-aviso',
  name: 'Aviso puntual',
  description: 'Plantilla manual sintética',
  category: 'General',
  title: 'Título manual',
  body: 'Cuerpo manual',
  route: null,
  enabled: true,
  variables: [],
  variable_help: {},
  delivery_info: { type: 'manual', label: 'Manual', description: 'Se envía desde el historial' },
  customized: false,
  is_system: false,
  updated_at: null,
}

const eventTemplate: NotificationTemplate = {
  ...manualTemplate,
  key: 'system-evento',
  name: 'Recordatorio evento',
  description: 'Plantilla automática sintética',
  category: 'Entrenos',
  title: 'Hola {name}',
  body: 'Entrena hoy {name}',
  route: '/trainings',
  enabled: false,
  variables: ['name'],
  variable_help: { name: 'Nombre del cliente' },
  delivery_info: { type: 'event', label: 'Evento', description: 'Al ocurrir un evento' },
  customized: true,
  is_system: true,
  updated_at: '2026-03-10T12:00:00.000Z',
}

const weeklyTemplate: NotificationTemplate = {
  ...eventTemplate,
  key: 'system-semanal',
  name: 'Resumen semanal',
  category: 'Resumen',
  title: 'Tu semana',
  body: 'Resumen de la semana',
  route: null,
  enabled: true,
  variables: [],
  variable_help: {},
  delivery_info: {
    type: 'schedule',
    label: 'Semanal',
    description: 'Se envía una vez por semana',
    schedule_kind: 'weekly',
    schedule_enabled: true,
    timezone: 'Europe/Madrid',
    times: ['07:30'],
    weekday: 1,
    cron: '30 7 * * 1',
  },
  customized: false,
  updated_at: null,
}

const mealTemplate: NotificationTemplate = {
  ...weeklyTemplate,
  key: 'system-comidas',
  name: 'Recordatorio comidas',
  category: 'Nutrición',
  title: 'Registra tu comida',
  body: 'No olvides registrar',
  delivery_info: {
    type: 'schedule',
    label: 'Diaria',
    description: 'Cuatro avisos al día',
    schedule_kind: 'meal_daily',
    schedule_enabled: false,
    timezone: 'Europe/Madrid',
    times: [],
  },
}

const all = [manualTemplate, eventTemplate, weeklyTemplate, mealTemplate]
const envelope = (data: unknown) => ({ data: { data } })

function httpError(status: number, message: string) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError(message, 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: 'err',
    headers: {},
    config,
    data: { message },
  })
}

beforeEach(() => {
  api.get.mockReset(); api.put.mockReset(); api.post.mockReset(); api.patch.mockReset(); api.delete.mockReset()
  toast.success.mockReset(); toast.error.mockReset()
  useAuth.setState({ user: { id: 'super', email: 'super@example.invalid', role: 'SUPER_ADMIN', profile: null } })
  api.get.mockResolvedValue(envelope(all))
  api.patch.mockResolvedValue(envelope(manualTemplate))
})

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NotificationTemplatesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function select(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(await screen.findByRole('button', { name }))
}

describe('NotificationTemplatesPage permissions', () => {
  it('shows only the notice for ADMIN and never loads or offers management', () => {
    useAuth.setState({ user: { id: 'a', email: 'a@example.invalid', role: 'ADMIN', profile: null } })
    mount()

    expect(screen.getByRole('heading', { name: 'Plantillas de notificaciones' })).toBeInTheDocument()
    expect(screen.getByText('Solo super admins pueden cambiar plantillas.')).toBeInTheDocument()
    expect(screen.getByText('No tienes permisos para modificar plantillas.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nueva plantilla' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
    expect(screen.queryByText('Plantillas')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Notificaciones' })).toHaveAttribute('href', '/notifications')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('offers the full management surface for SUPER_ADMIN', async () => {
    mount()

    expect(await screen.findByRole('button', { name: 'Nueva plantilla' })).toBeInTheDocument()
    expect(screen.queryByText('No tienes permisos para modificar plantillas.')).not.toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/notifications/templates')
  })
})

describe('NotificationTemplatesPage list and selection', () => {
  it('lists templates with counts, selects the first one and switches selection', async () => {
    const user = userEvent.setup()
    mount()

    expect(await screen.findByText('4 visibles de 4')).toBeInTheDocument()
    expect(screen.getByText('General: 1')).toBeInTheDocument()
    expect(screen.getByText('Entrenos: 1')).toBeInTheDocument()
    expect(screen.getByText('Pausada')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Título manual'))
    expect(screen.getByLabelText('Cuerpo')).toHaveValue('Cuerpo manual')
    expect(screen.getByLabelText('Activa')).toBeChecked()
    expect(screen.getByText('Último cambio: Sin cambios')).toBeInTheDocument()

    await select(user, /Recordatorio evento/)

    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Hola {name}'))
    expect(screen.getByLabelText('Ruta')).toHaveValue('/trainings')
    expect(screen.getByLabelText('Activa')).not.toBeChecked()
    expect(screen.getByText('Nombre del cliente')).toBeInTheDocument()
    expect(screen.getByText('{name}')).toBeInTheDocument()
    expect(screen.getByText('Editada')).toBeInTheDocument()
  })

  it('shows the no-variables note and the live preview with fallbacks', async () => {
    const user = userEvent.setup()
    mount()

    await screen.findByDisplayValue('Título manual')
    expect(screen.getByText(/no recibe datos dinámicos/)).toBeInTheDocument()
    expect(screen.getByText('Sin ruta')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Título'))
    await user.clear(screen.getByLabelText('Cuerpo'))
    expect(screen.getByText('Sin título')).toBeInTheDocument()
    expect(screen.getByText('Sin cuerpo')).toBeInTheDocument()
  })

  it('filters by search text and reports an empty result', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByText('4 visibles de 4')

    await user.type(screen.getByPlaceholderText('Nombre, categoría o texto'), 'comidas')

    expect(await screen.findByText('1 visibles de 4')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Registra tu comida'))

    await user.clear(screen.getByPlaceholderText('Nombre, categoría o texto'))
    await user.type(screen.getByPlaceholderText('Nombre, categoría o texto'), 'zzz-no-existe')

    expect(await screen.findByText('No hay plantillas con esos filtros.')).toBeInTheDocument()
    expect(screen.getByText('Selecciona una plantilla para editarla.')).toBeInTheDocument()
  })
})

describe('NotificationTemplatesPage text save', () => {
  it('keeps save disabled until something changes and counts body characters', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByDisplayValue('Título manual')

    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    expect(screen.getByText('13/500 caracteres')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Cuerpo'), '!')

    expect(screen.getByText('14/500 caracteres')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
  })

  it('saves trimmed title/body, normalized route and enabled through the template endpoint', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByDisplayValue('Título manual')

    await user.clear(screen.getByLabelText('Título'))
    await user.type(screen.getByLabelText('Título'), '  Nuevo título  ')
    await user.clear(screen.getByLabelText('Cuerpo'))
    await user.type(screen.getByLabelText('Cuerpo'), ' Nuevo cuerpo ')
    await user.type(screen.getByLabelText('Ruta'), ' /recap ')
    await user.click(screen.getByLabelText('Activa'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    expect(api.patch).toHaveBeenCalledWith('/notifications/templates/manual-aviso', {
      title: 'Nuevo título',
      body: 'Nuevo cuerpo',
      route: '/recap',
      enabled: false,
    })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plantilla actualizada'))
  })

  it('sends a null route when the route is cleared', async () => {
    const user = userEvent.setup()
    mount()
    await select(user, /Recordatorio evento/)
    await waitFor(() => expect(screen.getByLabelText('Ruta')).toHaveValue('/trainings'))

    await user.clear(screen.getByLabelText('Ruta'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    expect(api.patch).toHaveBeenCalledWith('/notifications/templates/system-evento', {
      title: 'Hola {name}',
      body: 'Entrena hoy {name}',
      route: null,
      enabled: false,
    })
  })

  it('rejects an empty title or body without calling the API', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByDisplayValue('Título manual')

    await user.clear(screen.getByLabelText('Título'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(toast.error).toHaveBeenCalledWith('Título y cuerpo son obligatorios')
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('rejects a route that does not start with a slash without calling the API', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByDisplayValue('Título manual')

    await user.type(screen.getByLabelText('Ruta'), 'recap')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(toast.error).toHaveBeenCalledWith('La ruta debe empezar por / o quedar vacía')
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('disables the form and shows progress while saving', async () => {
    let resolveSave: (value: unknown) => void = () => undefined
    api.patch.mockReturnValue(new Promise((resolve) => { resolveSave = resolve }))
    const user = userEvent.setup()
    mount()
    await screen.findByDisplayValue('Título manual')

    await user.type(screen.getByLabelText('Cuerpo'), '!')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const saving = await screen.findByRole('button', { name: 'Guardando...' })
    expect(saving).toBeDisabled()
    expect(screen.getByLabelText('Título')).toBeDisabled()
    expect(screen.getByLabelText('Cuerpo')).toBeDisabled()
    expect(screen.getByLabelText('Activa')).toBeDisabled()

    resolveSave(envelope(manualTemplate))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plantilla actualizada'))
  })

  it('reports the server message when saving fails and keeps the draft', async () => {
    api.patch.mockRejectedValue(httpError(400, 'Cuerpo demasiado largo'))
    const user = userEvent.setup()
    mount()
    await screen.findByDisplayValue('Título manual')

    await user.type(screen.getByLabelText('Cuerpo'), '!')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cuerpo demasiado largo'))
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Cuerpo')).toHaveValue('Cuerpo manual!')
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
  })
})

describe('NotificationTemplatesPage schedule save', () => {
  it('renders no schedule editor for manual or event templates', async () => {
    const user = userEvent.setup()
    mount()
    await screen.findByDisplayValue('Título manual')
    expect(screen.queryByLabelText('Programación activa')).not.toBeInTheDocument()

    await select(user, /Recordatorio evento/)
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Hola {name}'))
    expect(screen.queryByLabelText('Programación activa')).not.toBeInTheDocument()
    expect(screen.getByText('Por evento', { selector: 'div,span' })).toBeInTheDocument()
  })

  it('shows the weekly schedule with delivery info and a disabled save until edited', async () => {
    const user = userEvent.setup()
    mount()
    await select(user, /Resumen semanal/)

    await waitFor(() => expect(screen.getByLabelText('Hora')).toHaveValue('07:30'))
    expect(screen.getByLabelText('Huso horario')).toHaveValue('Europe/Madrid')
    expect(screen.getByLabelText('Día de la semana')).toHaveValue('1')
    expect(screen.getByLabelText('Programación activa')).toBeChecked()
    expect(screen.getByText('30 7 * * 1')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar horario' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('saves only the weekly schedule through the schedule endpoint when the text is clean', async () => {
    const user = userEvent.setup()
    mount()
    await select(user, /Resumen semanal/)
    await waitFor(() => expect(screen.getByLabelText('Hora')).toHaveValue('07:30'))

    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '18:45' } })
    await user.selectOptions(screen.getByLabelText('Día de la semana'), 'Miércoles')
    await user.clear(screen.getByLabelText('Huso horario'))
    await user.type(screen.getByLabelText('Huso horario'), '  UTC  ')
    await user.click(screen.getByLabelText('Programación activa'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    expect(api.patch).toHaveBeenCalledWith('/notifications/templates/system-semanal/schedule', {
      enabled: false,
      timezone: 'UTC',
      times: ['18:45'],
      weekday: 3,
    })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Horario actualizado'))
    expect(api.patch).not.toHaveBeenCalledWith('/notifications/templates/system-semanal', expect.anything())
  })

  it('does not touch the text draft when only the schedule changes and enables the single save', async () => {
    const user = userEvent.setup()
    mount()
    await select(user, /Resumen semanal/)
    await waitFor(() => expect(screen.getByLabelText('Hora')).toHaveValue('07:30'))

    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:00' } })

    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
    expect(screen.getByLabelText('Título')).toHaveValue('Tu semana')
    expect(screen.getByLabelText('Cuerpo')).toHaveValue('Resumen de la semana')
  })

  it('uses four meal times with fallback defaults and sends a null weekday', async () => {
    const user = userEvent.setup()
    mount()
    await select(user, /Recordatorio comidas/)

    await waitFor(() => expect(screen.getByLabelText('Desayuno')).toHaveValue('08:00'))
    expect(screen.getByLabelText('Comida')).toHaveValue('13:00')
    expect(screen.getByLabelText('Snack')).toHaveValue('17:00')
    expect(screen.getByLabelText('Cena')).toHaveValue('20:30')
    expect(screen.queryByLabelText('Día de la semana')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Programación activa')).not.toBeChecked()
    expect(screen.getByText('Pausado')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Cena'), { target: { value: '21:15' } })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1))
    expect(api.patch).toHaveBeenCalledWith('/notifications/templates/system-comidas/schedule', {
      enabled: false,
      timezone: 'Europe/Madrid',
      times: ['08:00', '13:00', '17:00', '21:15'],
      weekday: null,
    })
  })

  it('requires a timezone and every time before calling the API', async () => {
    const user = userEvent.setup()
    mount()
    await select(user, /Resumen semanal/)
    await waitFor(() => expect(screen.getByLabelText('Hora')).toHaveValue('07:30'))

    await user.clear(screen.getByLabelText('Huso horario'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(toast.error).toHaveBeenCalledWith('El huso horario es obligatorio')

    await user.type(screen.getByLabelText('Huso horario'), 'Europe/Madrid')
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(toast.error).toHaveBeenCalledWith('Completa todas las horas')

    expect(api.patch).not.toHaveBeenCalled()
  })

  it('reports the server message when saving the schedule fails', async () => {
    api.patch.mockRejectedValue(httpError(400, 'Horario inválido'))
    const user = userEvent.setup()
    mount()
    await select(user, /Resumen semanal/)
    await waitFor(() => expect(screen.getByLabelText('Hora')).toHaveValue('07:30'))

    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:00' } })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Horario inválido'))
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Hora')).toHaveValue('10:00')
  })

  it('shows progress and disables the schedule fields while saving', async () => {
    let resolveSave: (value: unknown) => void = () => undefined
    api.patch.mockReturnValue(new Promise((resolve) => { resolveSave = resolve }))
    const user = userEvent.setup()
    mount()
    await select(user, /Resumen semanal/)
    await waitFor(() => expect(screen.getByLabelText('Hora')).toHaveValue('07:30'))

    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '10:00' } })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('button', { name: 'Guardando...' })).toBeDisabled()
    expect(screen.getByLabelText('Hora')).toBeDisabled()
    expect(screen.getByLabelText('Huso horario')).toBeDisabled()

    resolveSave(envelope(weeklyTemplate))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Horario actualizado'))
  })
})

describe('NotificationTemplatesPage load error', () => {
  it('shows the server message and recovers on retry', async () => {
    api.get.mockRejectedValueOnce(httpError(403, 'Sin acceso a plantillas'))
    const user = userEvent.setup()
    mount()

    expect(await screen.findByText('No se pudieron cargar las plantillas')).toBeInTheDocument()
    expect(screen.getByText('Sin acceso a plantillas')).toBeInTheDocument()
    expect(screen.queryByText(/visibles de/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('4 visibles de 4')).toBeInTheDocument()
    expect(screen.queryByText('No se pudieron cargar las plantillas')).not.toBeInTheDocument()
  })
})
