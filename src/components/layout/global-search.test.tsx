import type { ReactNode } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { GlobalSearchProvider, GlobalSearchTrigger } from './global-search'
import { getActionEntries, getNavigationEntries } from './global-search-model'
import { resolveNavGroups } from './nav-model'
import { MobileTabbar } from './mobile-tabbar'
import { Header } from './header'

type Role = 'SUPER_ADMIN' | 'ADMIN'

interface ClientFixture {
  id: string
  email: string
  profile: { first_name: string; last_name: string; avatar_url: null }
}

interface RecordedParams {
  page?: number
  limit?: number
  search?: string
  archive?: string
}

interface ClientsResult {
  data: { data: ClientFixture[] } | undefined
  isError: boolean
  isFetching: boolean
  isPlaceholderData: boolean
  refetch: () => Promise<void>
}

const mocks = vi.hoisted(() => ({
  role: 'SUPER_ADMIN' as 'SUPER_ADMIN' | 'ADMIN',
  mode: 'ready' as 'ready' | 'loading' | 'error',
  params: [] as Array<{ page?: number; limit?: number; search?: string; archive?: string }>,
  clients: [] as Array<{
    id: string
    email: string
    profile: { first_name: string; last_name: string; avatar_url: null }
  }>,
  refetch: vi.fn(() => Promise.resolve()),
  // One stable result per term and mode, as react-query would return between renders.
  cache: new Map<string, unknown>(),
}))

function fold(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function clientsResult(params: RecordedParams): ClientsResult {
  const key = `${mocks.mode}|${params.search ?? ''}`
  const cached = mocks.cache.get(key) as ClientsResult | undefined
  if (cached) return cached
  const term = fold(params.search ?? '')
  const base = { isPlaceholderData: false, refetch: mocks.refetch }
  const result: ClientsResult =
    mocks.mode === 'loading'
      ? { ...base, data: undefined, isError: false, isFetching: true }
      : mocks.mode === 'error'
        ? { ...base, data: undefined, isError: true, isFetching: false }
        : {
            ...base,
            isError: false,
            isFetching: false,
            data: {
              data: mocks.clients.filter((client) =>
                fold(`${client.profile.first_name} ${client.profile.last_name} ${client.email}`).includes(term),
              ),
            },
          }
  mocks.cache.set(key, result)
  return result
}

vi.mock('@/hooks/use-auth', () => {
  const user = () => ({
    role: mocks.role,
    email: 'lucia@example.com',
    profile: { first_name: 'Lucía', last_name: 'Marín', avatar_url: null },
  })
  return {
    useAuth: (selector?: (state: { user: ReturnType<typeof user> }) => unknown) =>
      selector ? selector({ user: user() }) : { user: user(), logout: () => undefined },
  }
})

vi.mock('@/features/clients/api', () => ({
  useClients: (params: RecordedParams) => {
    mocks.params.push(params)
    return clientsResult(params)
  },
  useClientProfile: () => ({ data: undefined }),
}))

vi.mock('@/features/approval-requests/api', () => ({
  useApprovalStats: () => ({ data: undefined }),
}))

vi.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({ theme: 'dark', toggle: () => undefined }),
}))

function client(id: string, first: string, last: string): ClientFixture {
  return {
    id,
    email: `${fold(first)}.${fold(last)}@example.com`,
    profile: { first_name: first, last_name: last, avatar_url: null },
  }
}

const CLIENTS: ClientFixture[] = [
  client('c1', 'Sergio', 'Prol'),
  client('c2', 'Ana', 'Prieto'),
  client('c3', 'Pablo', 'Prado'),
  client('c4', 'Lucía', 'Prats'),
  client('c5', 'Marta', 'Prim'),
  client('c6', 'Íñigo', 'Pradera'),
  client('c7', 'Rosa', 'Prego'),
]

function LocationProbe() {
  const location = useLocation()
  return <main aria-label="Ruta actual">{location.pathname + location.search}</main>
}

function renderSearch(role: Role = 'SUPER_ADMIN', extra: ReactNode = null) {
  mocks.role = role
  render(
    <MemoryRouter initialEntries={['/inicio']}>
      <GlobalSearchProvider>
        <GlobalSearchTrigger />
        {extra}
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </GlobalSearchProvider>
    </MemoryRouter>,
  )
  return screen.getByRole('button', { name: 'Buscar' })
}

function currentPath() {
  return screen.getByRole('main', { name: 'Ruta actual' }).textContent
}

function getDialog() {
  return screen.getByRole('dialog', { name: 'Buscador' })
}

function queryDialog() {
  return screen.queryByRole('dialog', { name: 'Buscador' })
}

function getCombobox() {
  return within(getDialog()).getByRole('combobox')
}

function getOptions() {
  return within(getDialog()).queryAllByRole('option')
}

function getSelectedOption() {
  return getOptions().find((option) => option.getAttribute('aria-selected') === 'true')
}

function getGroupOptions(name: string) {
  return within(within(getDialog()).getByRole('group', { name })).queryAllByRole('option')
}

function expectActiveDescendantOnSelection() {
  const selected = getSelectedOption()
  expect(selected).toBeDefined()
  expect(getCombobox()).toHaveAttribute('aria-activedescendant', selected?.id)
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

function searchedTerms() {
  return [...new Set(mocks.params.map((params) => params.search))]
}

function navigationLabels(role: Role) {
  return resolveNavGroups(role).flatMap((group) => group.items.map((item) => item.label))
}

/**
 * Fake timers for the debounce. Testing Library only advances fake timers after each
 * user-event step when it sees a `jest` global, so it is shimmed with Vitest's clock;
 * without it every `await user.*` call hangs.
 */
function setupWithFakeTimers() {
  vi.useFakeTimers()
  vi.stubGlobal('jest', { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) })
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
}

beforeAll(() => {
  // cmdk needs both and jsdom implements neither.
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: () => undefined,
  })
})

afterAll(() => {
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
})

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  mocks.role = 'SUPER_ADMIN'
  mocks.mode = 'ready'
  mocks.params = []
  mocks.clients = CLIENTS
  mocks.cache.clear()
  mocks.refetch.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('buscador global: atajo y disparador', () => {
  it('Ctrl K abre el buscador con el foco en el combobox', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.keyboard('{Control>}k{/Control}')

    expect(getDialog()).toBeInTheDocument()
    expect(getCombobox()).toHaveFocus()
  })

  it('⌘ K (meta) abre el buscador', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.keyboard('{Meta>}k{/Meta}')

    expect(getDialog()).toBeInTheDocument()
  })

  it('repetir el atajo cierra el buscador', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.keyboard('{Control>}k{/Control}')
    expect(getDialog()).toBeInTheDocument()
    await user.keyboard('{Control>}k{/Control}')
    expect(queryDialog()).not.toBeInTheDocument()

    await user.keyboard('{Meta>}k{/Meta}')
    expect(getDialog()).toBeInTheDocument()
    await user.keyboard('{Meta>}k{/Meta}')
    expect(queryDialog()).not.toBeInTheDocument()
  })

  it('no abre si el foco está dentro de otro diálogo', async () => {
    const user = userEvent.setup()
    renderSearch(
      'SUPER_ADMIN',
      <div role="dialog" aria-label="Otro diálogo">
        <input aria-label="Campo del diálogo" />
      </div>,
    )

    screen.getByRole('textbox', { name: 'Campo del diálogo' }).focus()
    await user.keyboard('{Control>}k{/Control}')

    expect(queryDialog()).not.toBeInTheDocument()
  })

  it('el disparador expone aria-keyshortcuts y aria-expanded y abre al pulsarlo', async () => {
    const user = userEvent.setup()
    const trigger = renderSearch()

    expect(trigger).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K')
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)

    expect(getDialog()).toBeInTheDocument()
    expect(getCombobox()).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('la cabecera incluye el disparador del buscador', async () => {
    const user = userEvent.setup()
    mocks.role = 'ADMIN'
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <GlobalSearchProvider>
          <Header onMenuToggle={() => undefined} />
        </GlobalSearchProvider>
      </MemoryRouter>,
    )

    const trigger = screen.getByRole('button', { name: 'Buscar' })
    expect(trigger).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K')
    await user.click(trigger)

    expect(getDialog()).toBeInTheDocument()
  })
})

describe('buscador global: roles ARIA y región viva', () => {
  it('expone diálogo, combobox, listbox, opciones y recuento', async () => {
    const user = userEvent.setup()
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    const dialog = getDialog()
    const combobox = within(dialog).getByRole('combobox')
    const listbox = within(dialog).getByRole('listbox')
    expect(combobox).toHaveAttribute('aria-controls', listbox.id)
    const options = within(listbox).getAllByRole('option')
    const total = getNavigationEntries('SUPER_ADMIN').length + getActionEntries('SUPER_ADMIN').length
    expect(options).toHaveLength(total)
    expect(within(dialog).getByRole('status')).toHaveTextContent(`${total} resultados`)
  })

  it('aria-activedescendant apunta a la opción seleccionada al abrir y al escribir', async () => {
    const user = userEvent.setup()
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    expect(getCombobox()).toHaveAttribute('aria-activedescendant', getOptions()[0].id)
    expectActiveDescendantOnSelection()

    await user.type(getCombobox(), 'retos')

    expect(getOptions()).toHaveLength(1)
    expect(getCombobox()).toHaveAttribute('aria-activedescendant', getOptions()[0].id)
    expectActiveDescendantOnSelection()
  })

  it('anuncia «1 resultado» y «Sin resultados»', async () => {
    const user = setupWithFakeTimers()
    mocks.clients = []
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'retos')
    await advance(250)
    expect(within(getDialog()).getByRole('status')).toHaveTextContent(/^1 resultado$/)

    await user.clear(getCombobox())
    await user.type(getCombobox(), 'xyzw')
    await advance(250)
    expect(within(getDialog()).getByRole('status')).toHaveTextContent(/^Sin resultados$/)
  })

  it('aria-activedescendant sigue a la selección cuando llegan resultados de clientes', async () => {
    const user = setupWithFakeTimers()
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    // Ninguna pantalla ni acción contiene «sergio»: solo habrá clientes.
    await user.type(getCombobox(), 'sergio')
    expect(getOptions()).toHaveLength(0)
    expect(getCombobox()).not.toHaveAttribute('aria-activedescendant')

    await advance(250)

    const options = getOptions()
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('Sergio Prol'),
      'Ver todos en Usuarios',
    ])
    expect(getCombobox()).toHaveAttribute('aria-activedescendant', options[0].id)
    expectActiveDescendantOnSelection()
    expect(within(getDialog()).getByRole('status')).toHaveTextContent(/^1 resultado$/)
  })
})

describe('buscador global: teclado', () => {
  it('las flechas mueven la selección con bucle', async () => {
    const user = userEvent.setup()
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')
    const options = getOptions()

    await user.keyboard('{ArrowDown}')
    expect(getSelectedOption()).toBe(options[1])
    expectActiveDescendantOnSelection()

    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(getSelectedOption()).toBe(options[options.length - 1])
    expectActiveDescendantOnSelection()

    await user.keyboard('{ArrowDown}')
    expect(getSelectedOption()).toBe(options[0])
    expectActiveDescendantOnSelection()
  })

  it('Enter navega a la ruta de la opción seleccionada y cierra', async () => {
    const user = userEvent.setup()
    const trigger = renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    await user.keyboard('{ArrowDown}{Enter}')

    expect(queryDialog()).not.toBeInTheDocument()
    expect(currentPath()).toBe(getNavigationEntries('SUPER_ADMIN')[1].to)

    await user.click(trigger)
    await user.type(getCombobox(), 'retos')
    await user.keyboard('{Enter}')

    expect(queryDialog()).not.toBeInTheDocument()
    expect(currentPath()).toBe('/challenges')
  })

  it('Esc cierra y devuelve el foco al disparador', async () => {
    const user = userEvent.setup()
    const trigger = renderSearch()
    await user.click(trigger)
    expect(getCombobox()).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(queryDialog()).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('Esc tras abrir con el atajo devuelve el foco al elemento que lo tenía', async () => {
    const user = userEvent.setup()
    const trigger = renderSearch()
    trigger.focus()

    await user.keyboard('{Control>}k{/Control}')
    expect(getCombobox()).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(queryDialog()).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})

describe('buscador global: respeto del rol', () => {
  it('SUPER_ADMIN ve Plantillas, Nueva plantilla y Usuarios', async () => {
    const user = userEvent.setup()
    renderSearch('SUPER_ADMIN')
    await user.keyboard('{Control>}k{/Control}')

    const screens = getGroupOptions('Ir a')
    expect(screens.some((option) => option.textContent?.startsWith('Plantillas'))).toBe(true)
    expect(screens.some((option) => option.textContent?.startsWith('Usuarios'))).toBe(true)
    expect(screens.some((option) => option.textContent?.startsWith('Clientes'))).toBe(false)
    expect(getGroupOptions('Acciones').some((option) => option.textContent?.startsWith('Nueva plantilla'))).toBe(true)
  })

  it('ADMIN no ve Plantillas ni Nueva plantilla, ni escribiendo «plantilla»', async () => {
    const user = setupWithFakeTimers()
    renderSearch('ADMIN')
    await user.keyboard('{Control>}k{/Control}')

    const texts = getOptions().map((option) => option.textContent ?? '')
    expect(texts.some((text) => /plantilla/i.test(text))).toBe(false)
    expect(getGroupOptions('Ir a').some((option) => option.textContent?.startsWith('Clientes'))).toBe(true)
    expect(getGroupOptions('Ir a').some((option) => option.textContent?.startsWith('Usuarios'))).toBe(false)

    await user.type(getCombobox(), 'plantilla')
    await advance(250)

    expect(getOptions()).toHaveLength(0)
    expect(within(getDialog()).getByText('Sin resultados para “plantilla”')).toBeInTheDocument()
  })

  it.each<Role>(['SUPER_ADMIN', 'ADMIN'])('«Ir a» muestra los destinos de resolveNavGroups(%s)', async (role) => {
    const user = userEvent.setup()
    renderSearch(role)
    await user.keyboard('{Control>}k{/Control}')

    const labels = navigationLabels(role)
    const screens = getGroupOptions('Ir a')
    expect(screens).toHaveLength(labels.length)
    screens.forEach((option, index) => {
      expect(option.textContent?.startsWith(labels[index])).toBe(true)
    })
  })

  it('ADMIN navega a /clients desde «Clientes»', async () => {
    const user = userEvent.setup()
    renderSearch('ADMIN')
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'client')
    const option = getGroupOptions('Ir a').find((item) => item.textContent?.startsWith('Clientes'))
    expect(option).toBeDefined()
    if (option) await user.click(option)

    expect(currentPath()).toBe('/clients')
  })

  it.each<[Role, string]>([
    ['SUPER_ADMIN', '/users/c1'],
    ['ADMIN', '/clients/c1'],
  ])('el detalle de cliente navega según el rol (%s)', async (role, path) => {
    const user = setupWithFakeTimers()
    renderSearch(role)
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'sergio')
    await advance(250)
    expect(getSelectedOption()?.textContent).toContain('Sergio Prol')
    await user.keyboard('{Enter}')

    expect(queryDialog()).not.toBeInTheDocument()
    expect(currentPath()).toBe(path)
  })
})

describe('buscador global: clientes', () => {
  it('con 1 carácter no hay petición', async () => {
    const user = setupWithFakeTimers()
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'p')
    await advance(1000)

    expect(mocks.params).toHaveLength(0)
    expect(within(getDialog()).queryByRole('group', { name: 'Clientes' })).not.toBeInTheDocument()
  })

  it('con 2 o más caracteres hace una sola petición tras 250 ms con search, limit 5 y archive', async () => {
    const user = setupWithFakeTimers()
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'pro')
    await advance(249)
    expect(mocks.params).toHaveLength(0)

    await advance(1)
    expect(searchedTerms()).toEqual(['pro'])
    expect(mocks.params[0]).toEqual({ page: 1, limit: 5, search: 'pro', archive: 'visible' })
  })

  it('teclear rápido no dispara peticiones intermedias', async () => {
    const user = setupWithFakeTimers()
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'pr')
    await advance(200)
    await user.type(getCombobox(), 'a')
    await advance(200)
    await user.type(getCombobox(), 'd')
    await advance(249)
    expect(mocks.params).toHaveLength(0)

    await advance(1)
    expect(searchedTerms()).toEqual(['prad'])
  })

  it('muestra un esqueleto ocupado mientras carga', async () => {
    const user = setupWithFakeTimers()
    mocks.mode = 'loading'
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'sergio')
    // Durante el debounce ya se muestra el esqueleto.
    const pending = within(getDialog()).getByRole('group', { name: 'Clientes' })
    expect(pending.closest('[aria-busy="true"]')).not.toBeNull()
    expect(within(pending).queryAllByRole('option')).toHaveLength(0)

    await advance(250)
    expect(searchedTerms()).toEqual(['sergio'])
    const loading = within(getDialog()).getByRole('group', { name: 'Clientes' })
    expect(loading.closest('[aria-busy="true"]')).not.toBeNull()
    expect(within(loading).queryAllByRole('option')).toHaveLength(0)
    expect(within(getDialog()).queryByText(/Sin resultados para/)).not.toBeInTheDocument()
  })

  it('muestra como máximo 5 clientes y «Ver todos» navega a la lista con clientsFilters', async () => {
    const user = setupWithFakeTimers()
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'pr')
    await advance(250)

    const rows = getGroupOptions('Clientes')
    // 7 clientes coinciden: se muestran 5 más «Ver todos».
    expect(rows).toHaveLength(6)
    expect(rows[5]).toHaveTextContent('Ver todos en Usuarios')
    expect(within(getDialog()).queryByRole('group', { name: 'Clientes' })?.closest('[aria-busy="true"]')).toBeNull()

    await user.click(rows[5])

    expect(queryDialog()).not.toBeInTheDocument()
    const [pathname, search] = (currentPath() ?? '').split('?')
    expect(pathname).toBe('/users')
    expect(new URLSearchParams(search).get('clientsFilters')).toBe('q:pr')
  })

  it('ADMIN: «Ver todos» navega a /clients con clientsFilters', async () => {
    const user = setupWithFakeTimers()
    renderSearch('ADMIN')
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'sergio')
    await advance(250)
    await user.click(within(getDialog()).getByRole('option', { name: 'Ver todos en Clientes' }))

    expect(currentPath()).toBe('/clients?clientsFilters=q%3Asergio')
  })

  it('un error muestra «Reintentar» que vuelve a pedir', async () => {
    const user = setupWithFakeTimers()
    mocks.mode = 'error'
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'sergio')
    await advance(250)

    const dialog = getDialog()
    expect(within(dialog).getByRole('alert')).toHaveTextContent('No se pudieron buscar clientes')
    const retry = within(within(dialog).getByRole('group', { name: 'Clientes' })).getByRole('option')
    expect(retry).toHaveTextContent('Reintentar')
    expect(mocks.refetch).not.toHaveBeenCalled()

    await user.keyboard('{Enter}')

    expect(mocks.refetch).toHaveBeenCalledTimes(1)
    expect(getDialog()).toBeInTheDocument()
  })

  it('muestra «Sin resultados para “…”» cuando nada coincide', async () => {
    const user = setupWithFakeTimers()
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'zzz')
    expect(within(getDialog()).queryByText(/Sin resultados para/)).not.toBeInTheDocument()
    await advance(250)

    expect(within(getDialog()).getByText('Sin resultados para “zzz”')).toBeInTheDocument()
    expect(getOptions()).toHaveLength(0)
  })

  it('al reabrir, la consulta está vacía', async () => {
    const user = userEvent.setup()
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')
    await user.type(getCombobox(), 'retos')
    expect(getCombobox()).toHaveValue('retos')

    await user.keyboard('{Escape}')
    expect(queryDialog()).not.toBeInTheDocument()
    await user.keyboard('{Control>}k{/Control}')

    expect(getCombobox()).toHaveValue('')
    expect(getOptions().length).toBeGreaterThan(1)
  })
})

describe('buscador global: coincidencia', () => {
  it('encuentra sin distinguir mayúsculas ni tildes', async () => {
    const user = userEvent.setup()
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'NOTIFICACION')

    expect(getGroupOptions('Ir a').map((option) => option.textContent)).toEqual([
      expect.stringMatching(/^Notificaciones/),
    ])
    expect(getGroupOptions('Acciones').map((option) => option.textContent)).toEqual([
      expect.stringMatching(/^Enviar notificación/),
    ])

    await user.clear(getCombobox())
    await user.type(getCombobox(), 'ASIGNACIÓN')
    expect(getGroupOptions('Ir a').map((option) => option.textContent)).toEqual([
      expect.stringMatching(/^Asignaciones/),
    ])
  })

  it('no hace coincidencia difusa con letras no contiguas', async () => {
    const user = userEvent.setup()
    renderSearch()
    await user.keyboard('{Control>}k{/Control}')

    await user.type(getCombobox(), 'ntf')

    expect(within(getDialog()).queryByRole('group', { name: 'Ir a' })).not.toBeInTheDocument()
    expect(within(getDialog()).queryByRole('group', { name: 'Acciones' })).not.toBeInTheDocument()
  })
})

describe('buscador global: móvil', () => {
  function renderTabbar() {
    mocks.role = 'ADMIN'
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <GlobalSearchProvider>
          <MobileTabbar />
        </GlobalSearchProvider>
      </MemoryRouter>,
    )
  }

  it('«Buscar» es el primer elemento del panel «Más»', async () => {
    const user = userEvent.setup()
    renderTabbar()

    await user.click(screen.getByRole('button', { name: 'Más' }))
    const menu = await screen.findByRole('dialog', { name: 'Menú' })
    const nav = within(menu).getByRole('navigation', { name: 'Todas las secciones' })

    const firstItem = within(nav).getAllByRole('listitem')[0]
    expect(within(firstItem).getByRole('button', { name: 'Buscar' })).toHaveAttribute('aria-haspopup', 'dialog')
  })

  it('pulsar «Buscar» cierra «Más», abre el buscador y Esc devuelve el foco a «Más»', async () => {
    const user = userEvent.setup()
    renderTabbar()
    const more = screen.getByRole('button', { name: 'Más' })

    await user.click(more)
    const menu = await screen.findByRole('dialog', { name: 'Menú' })
    await user.click(within(menu).getByRole('button', { name: 'Buscar' }))

    expect(getDialog()).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument())
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(getCombobox()).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(queryDialog()).not.toBeInTheDocument()
    await waitFor(() => expect(more).toHaveFocus())
  })
})
