import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SendNotificationDialog } from './send-notification-dialog'

const sendMutate = vi.fn()
const sendAllMutate = vi.fn()
const clients = [
  { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.test', profile: { first_name: 'Ana', last_name: 'Gil' } },
  { id: '22222222-2222-4222-8222-222222222222', email: 'b@example.test', profile: { first_name: 'Beto', last_name: 'Ruiz' } },
  { id: '33333333-3333-4333-8333-333333333333', email: 'c@example.test', profile: { first_name: 'Cris', last_name: 'Paz' } },
]

vi.mock('../api', () => ({
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
  useSendNotification: () => ({ mutateAsync: (...args: unknown[]) => sendMutate(...args), isPending: false }),
  useSendToAllClients: () => ({ mutateAsync: (...args: unknown[]) => sendAllMutate(...args), isPending: false }),
}))
let clientsResponse: { data: typeof clients; total?: number } = { data: clients, total: clients.length }
let clientsFailed = false
vi.mock('../../clients/api', () => ({
  useClients: () => ({
    data: clientsResponse,
    isLoading: false,
    isError: clientsFailed,
    error: clientsFailed ? new Error('boom') : null,
  }),
}))
vi.mock('@/features/notification-templates/api', () => ({
  useNotificationTemplates: () => ({ data: [] }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

function renderDialog() {
  const onOpenChange = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // A fresh element per call: re-rendering the same element would bail out and skip the mocked hook.
  const ui = () => (
    <QueryClientProvider client={client}>
      <SendNotificationDialog open onOpenChange={onOpenChange} />
    </QueryClientProvider>
  )
  const { rerender } = render(ui())
  return { onOpenChange, rerender: () => rerender(ui()) }
}

async function fillMessage(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Título'), 'Hola equipo')
  await user.type(screen.getByLabelText('Cuerpo'), 'Mensaje de prueba')
}

describe('SendNotificationDialog', () => {
  beforeEach(() => {
    // cmdk (recipient picker) needs these browser APIs, which jsdom lacks.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    Element.prototype.scrollIntoView = vi.fn()
    clientsResponse = { data: clients, total: clients.length }
    clientsFailed = false
    sendMutate.mockReset()
    sendAllMutate.mockReset()
    sendMutate.mockResolvedValue({ status: 'SENT', error: null })
    sendAllMutate.mockResolvedValue({ success: true, sent: 3, failed: 0 })
  })

  describe('P1 confirm sending to everyone', () => {
    it('asks first, makes no call when cancelled with the button and keeps the form', async () => {
      const user = userEvent.setup({ delay: null })
      renderDialog()
      await fillMessage(user)
      await user.click(screen.getByLabelText('Enviar a todos mis clientes'))
      await user.click(screen.getByRole('button', { name: 'Enviar notificación' }))

      const confirm = await screen.findByRole('alertdialog')
      expect(within(confirm).getByText('¿Enviar la notificación a todos tus clientes?')).toBeInTheDocument()
      expect(within(confirm).getByText('Llegará a 3 clientes visibles de tu cartera.')).toBeInTheDocument()
      expect(sendAllMutate).not.toHaveBeenCalled()

      await user.click(within(confirm).getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

      expect(sendAllMutate).not.toHaveBeenCalled()
      expect(sendMutate).not.toHaveBeenCalled()
      expect(screen.getByLabelText('Título')).toHaveValue('Hola equipo')
      expect(screen.getByLabelText('Cuerpo')).toHaveValue('Mensaje de prueba')
      expect(screen.getByLabelText('Enviar a todos mis clientes')).toBeChecked()
    }, 15000)

    it('makes no call when cancelled with Escape', async () => {
      const user = userEvent.setup()
      renderDialog()
      await fillMessage(user)
      await user.click(screen.getByLabelText('Enviar a todos mis clientes'))
      await user.click(screen.getByRole('button', { name: 'Enviar notificación' }))
      await screen.findByRole('alertdialog')

      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

      expect(sendAllMutate).not.toHaveBeenCalled()
      expect(screen.getByLabelText('Título')).toHaveValue('Hola equipo')
      expect(screen.getByRole('dialog', { name: 'Enviar notificación' })).toBeInTheDocument()
    })

    it('sends with the same arguments once confirmed', async () => {
      const user = userEvent.setup()
      const { onOpenChange } = renderDialog()
      await fillMessage(user)
      await user.click(screen.getByLabelText('Enviar a todos mis clientes'))
      await user.click(screen.getByRole('button', { name: 'Enviar notificación' }))

      const confirm = await screen.findByRole('alertdialog')
      await user.click(within(confirm).getByRole('button', { name: 'Enviar a todos' }))

      await waitFor(() => expect(sendAllMutate).toHaveBeenCalledTimes(1))
      expect(sendAllMutate).toHaveBeenCalledWith({
        title: 'Hola equipo',
        body: 'Mensaje de prueba',
        data: { type: 'home' },
      })
      expect(sendMutate).not.toHaveBeenCalled()
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    })

    it('announces the real portfolio total, not the 200 loaded', async () => {
      const user = userEvent.setup({ delay: null })
      clientsResponse = {
        data: Array.from({ length: 200 }, (_, index) => ({
          id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
          email: `c${index}@example.test`,
          profile: { first_name: `C${index}`, last_name: 'Test' },
        })),
        total: 350,
      }
      renderDialog()
      expect(screen.getByText('Se enviará a 350 clientes visibles.')).toBeInTheDocument()
      await fillMessage(user)
      await user.click(screen.getByLabelText('Enviar a todos mis clientes'))
      await user.click(screen.getByRole('button', { name: 'Enviar notificación' }))

      const confirm = await screen.findByRole('alertdialog')
      expect(within(confirm).getByText('Llegará a 350 clientes visibles de tu cartera.')).toBeInTheDocument()
      expect(within(confirm).queryByText(/\b200\b/)).not.toBeInTheDocument()
    }, 15000)

    it('uses a text without figure when the response has no usable total', async () => {
      const user = userEvent.setup({ delay: null })
      clientsResponse = { data: clients }
      renderDialog()
      expect(screen.getByText('Se enviará a todos los clientes visibles.')).toBeInTheDocument()
      await fillMessage(user)
      await user.click(screen.getByLabelText('Enviar a todos mis clientes'))
      await user.click(screen.getByRole('button', { name: 'Enviar notificación' }))

      const confirm = await screen.findByRole('alertdialog')
      expect(within(confirm).getByText('Llegará a todos los clientes visibles de tu cartera.')).toBeInTheDocument()
    }, 15000)

    it('aborts without calling the API when the clients query fails while the confirmation is open', async () => {
      const user = userEvent.setup()
      const { rerender } = renderDialog()
      await fillMessage(user)
      await user.click(screen.getByLabelText('Enviar a todos mis clientes'))
      await user.click(screen.getByRole('button', { name: 'Enviar notificación' }))
      const confirm = await screen.findByRole('alertdialog')

      clientsFailed = true
      rerender()
      await waitFor(() => expect(screen.getByLabelText('Enviar a todos mis clientes')).not.toBeChecked())

      await user.click(within(confirm).getByRole('button', { name: 'Enviar a todos' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

      expect(sendAllMutate).not.toHaveBeenCalled()
      expect(sendMutate).not.toHaveBeenCalled()
    })

    it('does not ask for confirmation when sending to specific recipients', async () => {
      const user = userEvent.setup()
      renderDialog()
      await fillMessage(user)
      await user.click(screen.getByText('Seleccionar destinatarios...'))
      await user.click(await screen.findByText('Ana Gil'))
      await user.keyboard('{Escape}')
      await user.click(screen.getByRole('button', { name: 'Enviar notificación' }))

      await waitFor(() => expect(sendMutate).toHaveBeenCalledTimes(1))
      expect(sendMutate).toHaveBeenCalledWith({
        title: 'Hola equipo',
        body: 'Mensaje de prueba',
        data: { type: 'home' },
        user_id: clients[0].id,
      })
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(sendAllMutate).not.toHaveBeenCalled()
    })
  })

  describe('recipients accessibility (RDS-F5-01)', () => {
    it('labels the recipients combobox and links it to the error after an empty submit', async () => {
      const user = userEvent.setup()
      renderDialog()
      const recipients = screen.getByRole('combobox', { name: 'Destinatarios' })
      expect(recipients).not.toHaveAttribute('aria-invalid', 'true')

      await fillMessage(user)
      await user.click(screen.getByRole('button', { name: 'Enviar notificación' }))

      await waitFor(() => expect(recipients).toHaveAttribute('aria-invalid', 'true'))
      expect(recipients).toHaveAccessibleDescription(/Selecciona al menos un destinatario/)
    })
  })

  describe('P9 counters and push preview', () => {
    it('shows N/100 and N/500 counters that follow what is typed', async () => {
      const user = userEvent.setup()
      renderDialog()

      expect(screen.getByText('0/100')).toBeInTheDocument()
      expect(screen.getByText('0/500')).toBeInTheDocument()

      await user.type(screen.getByLabelText('Título'), 'Hola')
      await user.type(screen.getByLabelText('Cuerpo'), 'Mensaje')

      expect(screen.getByText('4/100')).toBeInTheDocument()
      expect(screen.getByText('7/500')).toBeInTheDocument()
    })

    it('flags the excess with an announced state and keeps the schema validation', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByLabelText('Título'))
      await user.paste('x'.repeat(101))

      const counter = screen.getByTestId('counter-título')
      expect(counter).toHaveTextContent('101/100')
      expect(counter).toHaveTextContent('límite superado')
      expect(counter).not.toHaveAttribute('aria-live')
      expect(screen.getByTestId('counter-status-título')).toHaveTextContent('Límite superado')
      expect(counter).toHaveClass('text-status-error')

      await user.click(screen.getByRole('button', { name: 'Enviar notificación' }))
      expect(await screen.findByText('El título no puede superar los 100 caracteres')).toBeInTheDocument()
      expect(sendMutate).not.toHaveBeenCalled()
    })

    it('announces the counter only when crossing thresholds, not on every keystroke', async () => {
      const user = userEvent.setup()
      renderDialog()
      const status = screen.getByTestId('counter-status-título')
      const title = screen.getByLabelText('Título')
      expect(status).toHaveAttribute('role', 'status')
      expect(status).toHaveTextContent('')

      await user.click(title)
      await user.paste('x'.repeat(89))
      expect(status).toHaveTextContent('')

      await user.type(title, 'y')
      expect(status).toHaveTextContent('Quedan 10 caracteres')

      await user.type(title, 'z')
      expect(status).toHaveTextContent('Quedan 10 caracteres')

      await user.paste('w'.repeat(10))
      expect(status).toHaveTextContent('Límite superado')
      await user.type(title, 'q')
      expect(status).toHaveTextContent('Límite superado')

      await user.keyboard('{Backspace>7/}')
      expect(status).toHaveTextContent('Dentro del límite')
    })

    it('shows a dimmed fallback in the preview when empty and updates it live', async () => {
      const user = userEvent.setup()
      renderDialog()

      const preview = screen.getByTestId('push-preview')
      expect(preview).toHaveAttribute('aria-hidden', 'true')
      expect(within(preview).getByText('EXOM')).toBeInTheDocument()
      expect(within(preview).getByText('Título de la notificación')).toHaveClass('text-foreground-muted')
      expect(within(preview).getByText('El mensaje aparecerá aquí')).toBeInTheDocument()

      await user.type(screen.getByLabelText('Título'), 'Buen trabajo')
      await user.type(screen.getByLabelText('Cuerpo'), 'Sigue así')

      expect(within(preview).getByText('Buen trabajo')).not.toHaveClass('text-foreground-muted')
      expect(within(preview).getByText('Sigue así')).toBeInTheDocument()
      expect(within(preview).queryByText('Título de la notificación')).not.toBeInTheDocument()
    })

    it('truncates long text in the preview like an operating system', async () => {
      const user = userEvent.setup()
      renderDialog()
      await user.click(screen.getByLabelText('Cuerpo'))
      await user.paste('palabra '.repeat(40))

      const preview = screen.getByTestId('push-preview')
      expect(within(preview).getByText(/palabra/)).toHaveClass('line-clamp-2')
    })
  })
})
