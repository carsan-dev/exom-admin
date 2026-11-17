import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Exercise } from '../types'
import { ExercisesList } from './exercises-list'

const exercise = (id: string, name: string): Exercise => ({
  id,
  name,
  muscle_groups: ['Pecho'],
  equipment: [],
  level: 'PRINCIPIANTE',
  video_url: null,
  video_stream_id: null,
  thumbnail_url: null,
  technique_text: null,
  common_errors_text: null,
  explanation_text: null,
  is_active: true,
  created_at: '',
  updated_at: '',
  training_usage_count: 0,
  is_used_in_training: false,
})

const PAGE_ONE = [exercise('e-1', 'Press banca'), exercise('e-2', 'Sentadilla')]
const PAGE_TWO = [exercise('e-3', 'Dominadas')]

function stubViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }),
  })
}

function Harness({ exercises, initial = [] }: { exercises: Exercise[]; initial?: string[] }) {
  const [selectedIds, setSelectedIds] = useState(new Set(initial))
  return (
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <ExercisesList
          exercises={exercises}
          onView={vi.fn()}
          onEdit={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
        <output data-testid="selected">{[...selectedIds].join(',')}</output>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

const header = () => screen.getByRole<HTMLInputElement>('checkbox', { name: 'Seleccionar página' })
const row = (name: string) => screen.getByRole<HTMLInputElement>('checkbox', { name: `Seleccionar ${name}` })

describe.each([
  ['table', true],
  ['mobile list', false],
])('ExercisesList selection (%s)', (_label, desktop) => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('names a checkbox per row and one for the page', () => {
    stubViewport(desktop)
    render(<Harness exercises={PAGE_ONE} />)

    expect(row('Press banca')).not.toBeChecked()
    expect(row('Sentadilla')).not.toBeChecked()
    expect(header()).not.toBeChecked()
    expect(header().indeterminate).toBe(false)
  })

  it('shows the header as mixed with a partial selection and checked when the page is full', async () => {
    stubViewport(desktop)
    render(<Harness exercises={PAGE_ONE} />)

    await userEvent.click(row('Press banca'))
    expect(header().indeterminate).toBe(true)
    expect(header()).not.toBeChecked()

    await userEvent.click(row('Sentadilla'))
    expect(header().indeterminate).toBe(false)
    expect(header()).toBeChecked()
  })

  it('selects the page from a mixed header and deselects it when it is full', async () => {
    stubViewport(desktop)
    render(<Harness exercises={PAGE_ONE} />)
    await userEvent.click(row('Press banca'))

    await userEvent.click(header())
    expect(screen.getByTestId('selected')).toHaveTextContent('e-1,e-2')

    await userEvent.click(header())
    expect(screen.getByTestId('selected')).toHaveTextContent('')
    expect(row('Press banca')).not.toBeChecked()
  })

  it('keeps ids selected on other pages when toggling the visible page', async () => {
    stubViewport(desktop)
    render(<Harness exercises={PAGE_TWO} initial={['e-1']} />)
    expect(header().indeterminate).toBe(false)
    expect(header()).not.toBeChecked()

    await userEvent.click(header())
    expect(screen.getByTestId('selected')).toHaveTextContent('e-1,e-3')

    await userEvent.click(header())
    expect(screen.getByTestId('selected')).toHaveTextContent('e-1')
  })
})

describe('ExercisesList table selection state', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('marks selected rows with data-state', async () => {
    stubViewport(true)
    render(<Harness exercises={PAGE_ONE} initial={['e-2']} />)

    expect(row('Sentadilla').closest('tr')).toHaveAttribute('data-state', 'selected')
    expect(row('Press banca').closest('tr')).not.toHaveAttribute('data-state')
  })
})
