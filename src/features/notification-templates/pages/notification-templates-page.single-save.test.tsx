import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
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

const weeklyTemplate: NotificationTemplate = {
  ...manualTemplate,
  key: 'system-semanal',
  name: 'Resumen semanal',
  description: 'Plantilla automática sintética',
  category: 'Resumen',
  title: 'Tu semana',
  body: 'Resumen de la semana',
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
  is_system: true,
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
    schedule_enabled: true,
    timezone: 'Europe/Madrid',
    times: ['08:00', '13:00', '17:00', '20:30'],
  },
}

const SWITCH_TITLE = 'Hay cambios sin guardar'
const TEXT_URL = '/notifications/templates/system-semanal'
const SCHEDULE_URL = '/notifications/templates/system-semanal/schedule'
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

/** In-memory server so that refetches after a successful PATCH return the saved values. */
let server: NotificationTemplate[] = []
let failures: Record<string, Error> = {}

function applyPatch(url: string, values: Record<string, unknown>) {
  const scheduleMatch = /^\/notifications\/templates\/([^/]+)\/schedule$/.exec(url)
  const textMatch = /^\/notifications\/templates\/([^/]+)$/.exec(url)
  const key = scheduleMatch?.[1] ?? textMatch?.[1]
  server = server.map((template) => {
    if (template.key !== key) return template
    if (scheduleMatch) {
      return {
        ...template,
        delivery_info: {
          ...template.delivery_info,
          schedule_enabled: values.enabled as boolean,
          timezone: values.timezone as string,
          times: values.times as string[],
          weekday: (values.weekday as number | null) ?? undefined,
        },
      }
    }
    return { ...template, ...(values as Partial<NotificationTemplate>) }
  })
  return envelope(server.find((template) => template.key === key))
}

beforeEach(() => {
  api.get.mockReset(); api.put.mockReset(); api.post.mockReset(); api.patch.mockReset(); api.delete.mockReset()
  toast.success.mockReset(); toast.error.mockReset()
  useUnsavedChangesStore.setState({ dirtyEditors: {}, hasUnsavedChanges: false })
  useAuth.setState({ user: { id: 'super', email: 'super@example.invalid', role: 'SUPER_ADMIN', profile: null } })
  server = [manualTemplate, weeklyTemplate, mealTemplate]
  failures = {}
  api.get.mockImplementation(async () => envelope(server))
  api.patch.mockImplementation(async (url: string, values: Record<string, unknown>) => {
    const failure = failures[url]
    if (failure) throw failure
    return applyPatch(url, values)
  })
})

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <NotificationTemplatesPage />
    </QueryClientProvider>,
  )
}

const saveButton = () => screen.getByRole('button', { name: 'Guardar cambios' })
const patchUrls = () => api.patch.mock.calls.map(([url]) => url as string)

async function openWeekly(user: ReturnType<typeof userEvent.setup>) {
  mount()
  await user.click(await screen.findByRole('button', { name: /Resumen semanal/ }))
  await waitFor(() => expect(screen.getByLabelText('Hora')).toHaveValue('07:30'))
  await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Tu semana'))
}

async function editText(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Cuerpo'), '!')
}

function editSchedule() {
  fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '18:45' } })
}

describe('NotificationTemplatesPage single save (P10)', () => {
  it('has a single save button: no separate schedule save', async () => {
    const user = userEvent.setup()
    await openWeekly(user)

    expect(screen.queryByRole('button', { name: 'Guardar horario' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Guardar cambios' })).toHaveLength(1)
    expect(saveButton()).toBeDisabled()
  })

  it('only text dirty: sends only the text PATCH', async () => {
    const user = userEvent.setup()
    await openWeekly(user)

    await editText(user)
    expect(saveButton()).toBeEnabled()
    await user.click(saveButton())

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plantilla actualizada'))
    expect(patchUrls()).toEqual([TEXT_URL])
    expect(api.patch).toHaveBeenCalledWith(TEXT_URL, {
      title: 'Tu semana',
      body: 'Resumen de la semana!',
      route: null,
      enabled: true,
    })
    await waitFor(() => expect(saveButton()).toBeDisabled())
  })

  it('only schedule dirty: sends only the schedule PATCH and enables the single button', async () => {
    const user = userEvent.setup()
    await openWeekly(user)

    editSchedule()
    expect(saveButton()).toBeEnabled()
    await user.click(saveButton())

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Horario actualizado'))
    expect(patchUrls()).toEqual([SCHEDULE_URL])
    expect(api.patch).toHaveBeenCalledWith(SCHEDULE_URL, {
      enabled: true,
      timezone: 'Europe/Madrid',
      times: ['18:45'],
      weekday: 1,
    })
    await waitFor(() => expect(saveButton()).toBeDisabled())
    expect(screen.getByLabelText('Hora')).toHaveValue('18:45')
  })

  it('both dirty: sends both PATCHes with today’s payloads and reports both successes', async () => {
    const user = userEvent.setup({ delay: null })
    await openWeekly(user)

    await user.clear(screen.getByLabelText('Título'))
    await user.type(screen.getByLabelText('Título'), '  Nueva semana  ')
    await user.type(screen.getByLabelText('Ruta'), ' /recap ')
    editSchedule()
    await user.selectOptions(screen.getByLabelText('Día de la semana'), 'Miércoles')
    await user.clear(screen.getByLabelText('Huso horario'))
    await user.type(screen.getByLabelText('Huso horario'), '  UTC  ')
    await user.click(screen.getByLabelText('Programación activa'))
    await user.click(saveButton())

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2))
    expect(api.patch).toHaveBeenCalledWith(TEXT_URL, {
      title: 'Nueva semana',
      body: 'Resumen de la semana',
      route: '/recap',
      enabled: true,
    })
    expect(api.patch).toHaveBeenCalledWith(SCHEDULE_URL, {
      enabled: false,
      timezone: 'UTC',
      times: ['18:45'],
      weekday: 3,
    })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plantilla actualizada'))
    expect(toast.success).toHaveBeenCalledWith('Horario actualizado')
    expect(toast.error).not.toHaveBeenCalled()
    await waitFor(() => expect(saveButton()).toBeDisabled())
    expect(screen.getByLabelText('Título')).toHaveValue('Nueva semana')
    expect(screen.getByLabelText('Huso horario')).toHaveValue('UTC')
  }, 15000)

  it('text fails, schedule succeeds: schedule becomes clean, text edits kept, retry sends only text', async () => {
    failures[TEXT_URL] = httpError(400, 'Cuerpo demasiado largo')
    const user = userEvent.setup()
    await openWeekly(user)

    await editText(user)
    editSchedule()
    await user.click(saveButton())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cuerpo demasiado largo'))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Horario actualizado'))
    expect(toast.success).not.toHaveBeenCalledWith('Plantilla actualizada')
    expect(screen.getByLabelText('Cuerpo')).toHaveValue('Resumen de la semana!')
    expect(screen.getByLabelText('Hora')).toHaveValue('18:45')
    await waitFor(() => expect(saveButton()).toBeEnabled())

    delete failures[TEXT_URL]
    api.patch.mockClear()
    await user.click(saveButton())

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plantilla actualizada'))
    expect(patchUrls()).toEqual([TEXT_URL])
    await waitFor(() => expect(saveButton()).toBeDisabled())
  })

  it('schedule fails, text succeeds: text becomes clean, schedule edits kept, retry sends only schedule', async () => {
    failures[SCHEDULE_URL] = httpError(400, 'Horario inválido')
    const user = userEvent.setup()
    await openWeekly(user)

    await editText(user)
    editSchedule()
    await user.click(saveButton())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Horario inválido'))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plantilla actualizada'))
    expect(toast.success).not.toHaveBeenCalledWith('Horario actualizado')
    expect(screen.getByLabelText('Hora')).toHaveValue('18:45')
    expect(screen.getByLabelText('Cuerpo')).toHaveValue('Resumen de la semana!')
    await waitFor(() => expect(saveButton()).toBeEnabled())

    delete failures[SCHEDULE_URL]
    api.patch.mockClear()
    await user.click(saveButton())

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Horario actualizado'))
    expect(patchUrls()).toEqual([SCHEDULE_URL])
    await waitFor(() => expect(saveButton()).toBeDisabled())
  })

  it('an invalid dirty text part blocks both requests', async () => {
    const user = userEvent.setup()
    await openWeekly(user)

    await user.clear(screen.getByLabelText('Título'))
    editSchedule()
    await user.click(saveButton())

    expect(toast.error).toHaveBeenCalledWith('Título y cuerpo son obligatorios')
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('an invalid dirty schedule part blocks both requests', async () => {
    const user = userEvent.setup()
    await openWeekly(user)

    await editText(user)
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '' } })
    await user.click(saveButton())

    expect(toast.error).toHaveBeenCalledWith('Completa todas las horas')
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('disables the button while either request is pending: a double click sends each part once', async () => {
    let resolveText: () => void = () => undefined
    api.patch.mockImplementation((url: string, values: Record<string, unknown>) => {
      if (url === TEXT_URL) {
        return new Promise((resolve) => { resolveText = () => resolve(applyPatch(url, values)) })
      }
      return Promise.resolve(applyPatch(url, values))
    })
    const user = userEvent.setup()
    await openWeekly(user)

    await editText(user)
    editSchedule()
    await user.dblClick(saveButton())

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Horario actualizado'))
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled()
    expect(screen.getByLabelText('Hora')).toBeDisabled()
    expect(screen.getByLabelText('Cuerpo')).toBeDisabled()
    expect(api.patch).toHaveBeenCalledTimes(2)

    resolveText()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plantilla actualizada'))
    await waitFor(() => expect(saveButton()).toBeDisabled())
    expect(api.patch).toHaveBeenCalledTimes(2)
  })

  it('in-flight guard: two synchronous submits before any await send each part once', async () => {
    let resolveText: () => void = () => undefined
    api.patch.mockImplementation((url: string, values: Record<string, unknown>) => {
      if (url === TEXT_URL) {
        return new Promise((resolve) => { resolveText = () => resolve(applyPatch(url, values)) })
      }
      return Promise.resolve(applyPatch(url, values))
    })
    const user = userEvent.setup()
    await openWeekly(user)

    await editText(user)
    editSchedule()
    const form = saveButton().closest('form')
    if (!form) throw new Error('form not found')
    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Horario actualizado'))
    expect(api.patch).toHaveBeenCalledTimes(2)

    resolveText()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plantilla actualizada'))
    expect(api.patch).toHaveBeenCalledTimes(2)
  })

  it('switching with dirty text asks: cancel keeps the drafts, accept switches and discards', async () => {
    const user = userEvent.setup()
    await openWeekly(user)
    await editText(user)

    await user.click(screen.getByRole('button', { name: /Recordatorio comidas/ }))
    expect(screen.getByRole('alertdialog', { name: SWITCH_TITLE })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Permanecer' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Resumen semanal' })).toBeInTheDocument()
    expect(screen.getByLabelText('Cuerpo')).toHaveValue('Resumen de la semana!')

    await user.click(screen.getByRole('button', { name: /Recordatorio comidas/ }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Salir sin guardar' }))

    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Registra tu comida'))
    await user.click(screen.getByRole('button', { name: /Resumen semanal/ }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Cuerpo')).toHaveValue('Resumen de la semana'))
  })

  it('switching with a dirty schedule asks: cancel keeps the schedule draft, accept switches', async () => {
    const user = userEvent.setup()
    await openWeekly(user)
    editSchedule()

    await user.click(screen.getByRole('button', { name: /Aviso puntual/ }))
    expect(screen.getByRole('alertdialog', { name: SWITCH_TITLE })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Permanecer' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Hora')).toHaveValue('18:45')

    await user.click(screen.getByRole('button', { name: /Aviso puntual/ }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Salir sin guardar' }))
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Título manual'))
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('a clean editor switches without asking', async () => {
    const user = userEvent.setup()
    await openWeekly(user)

    await user.click(screen.getByRole('button', { name: /Aviso puntual/ }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Título manual'))
  })

  it('a search that hides the dirty template keeps it selected with its edits', async () => {
    const user = userEvent.setup()
    await openWeekly(user)
    await editText(user)
    editSchedule()

    await user.type(screen.getByPlaceholderText('Nombre, categoría o texto'), 'comidas')
    expect(await screen.findByText('1 visibles de 3')).toBeInTheDocument()

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resumen semanal' })).toBeInTheDocument()
    expect(screen.getByLabelText('Cuerpo')).toHaveValue('Resumen de la semana!')
    expect(screen.getByLabelText('Hora')).toHaveValue('18:45')

    await user.clear(screen.getByPlaceholderText('Nombre, categoría o texto'))
    expect(await screen.findByText('3 visibles de 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Cuerpo')).toHaveValue('Resumen de la semana!')
  })

  it('a late save response after switching does not write into the new template drafts', async () => {
    let resolveText: () => void = () => undefined
    api.patch.mockImplementation((url: string, values: Record<string, unknown>) =>
      new Promise((resolve) => { resolveText = () => resolve(applyPatch(url, values)) }),
    )
    const user = userEvent.setup()
    await openWeekly(user)
    await editText(user)
    await user.click(saveButton())
    await screen.findByRole('button', { name: 'Guardando...' })

    await user.click(screen.getByRole('button', { name: /Aviso puntual/ }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Salir sin guardar' }))
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Título manual'))

    resolveText()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plantilla actualizada'))
    await waitFor(() => expect(screen.getByLabelText('Título')).toBeEnabled())
    await user.type(screen.getByLabelText('Título'), '?')
    expect(screen.getByRole('heading', { name: 'Aviso puntual' })).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('Título manual?')
    expect(screen.getByLabelText('Cuerpo')).toHaveValue('Cuerpo manual')
  })

  it('the route guard flag is set by either part and cleared after a full successful save', async () => {
    const dirty = () => useUnsavedChangesStore.getState().dirtyEditors['notification-template']
    const user = userEvent.setup()
    await openWeekly(user)
    expect(dirty()).toBeUndefined()

    editSchedule()
    await waitFor(() => expect(dirty()).toBe(true))
    await user.click(saveButton())
    await waitFor(() => expect(saveButton()).toBeDisabled())
    await waitFor(() => expect(dirty()).toBeUndefined())

    await editText(user)
    await waitFor(() => expect(dirty()).toBe(true))
    editSchedule()
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '19:00' } })
    await user.click(saveButton())
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Plantilla actualizada'))
    await waitFor(() => expect(dirty()).toBeUndefined())
  })
})
