import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '@/lib/api'
import { DayProgressDetail } from './day-progress-detail'

type Props = React.ComponentProps<typeof DayProgressDetail>

function renderDetail(props: Partial<Props>) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DayProgressDetail clientId="client-1" date="2026-06-29" progress={undefined} {...props} />
    </QueryClientProvider>
  )
}

const progressWithNote = {
  id: 'progress-1',
  client_id: 'client-1',
  date: '2026-06-29',
  training_completed: false,
  exercises_completed: [],
  meals_completed: [],
  meals_completed_details: [],
  notes: 'Me molestó la rodilla',
  admin_reply_text: null,
  admin_reply_sent_at: null,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Detalle del día: comportamiento conservado', () => {
  it('avisa del push, ofrece Responder al escribir sin respuesta previa y envía la respuesta', async () => {
    vi.spyOn(api, 'put').mockResolvedValue({ data: { data: progressWithNote } })
    renderDetail({ progress: progressWithNote })

    expect(screen.getByText('Una respuesta nueva o modificada enviará una notificación push al cliente.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar respuesta' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Respuesta para el cliente'), 'Descansa')
    expect(screen.getByText('8/1000')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Responder' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/clients/client-1/progress/reply', { date: '2026-06-29', reply: 'Descansa' }))
  })

  it('muestra el error de carga con reintento y el estado sin registro', () => {
    const retry = vi.fn()
    const { unmount } = renderDetail({ isError: true, onRetry: retry })
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el detalle del día')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar detalle' }))
    expect(retry).toHaveBeenCalledOnce()
    unmount()
    renderDetail({ progress: null })
    expect(screen.getByText('Sin registro de progreso para este día.')).toBeInTheDocument()
  })
})
