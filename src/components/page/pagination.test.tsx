import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Pagination } from './pagination'

describe('Pagination', () => {
  it('renders a nav named «Paginación» with the page label and both buttons', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={() => {}} />)
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  it('allows overriding the nav name and the labels', () => {
    render(
      <Pagination
        page={2}
        totalPages={5}
        onPageChange={() => {}}
        aria-label="Paginación de clientes"
        previousLabel="Atrás"
        nextLabel="Adelante"
        pageLabel={(p, t) => `Pág. ${p}/${t}`}
      />
    )
    expect(screen.getByRole('navigation', { name: 'Paginación de clientes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atrás' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adelante' })).toBeInTheDocument()
    expect(screen.getByText('Pág. 2/5')).toBeInTheDocument()
  })

  it('renders the summary slot', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={() => {}} summary="42 resultados" />)
    expect(screen.getByText('42 resultados')).toBeInTheDocument()
  })

  it('disables «Anterior» on the first page', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  it('disables «Siguiente» on the last page', () => {
    render(<Pagination page={3} totalPages={3} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled()
  })

  it('calls onPageChange with page-1 and page+1 on click', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />)
    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3)
  })

  it('works with the keyboard: Enter and Space', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Anterior' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onPageChange).toHaveBeenLastCalledWith(1)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveFocus()
    await user.keyboard(' ')
    expect(onPageChange).toHaveBeenLastCalledWith(3)
    expect(onPageChange).toHaveBeenCalledTimes(2)
  })

  it('blocks every call and disables both buttons when disabled', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} disabled />)
    const previous = screen.getByRole('button', { name: 'Anterior' })
    const next = screen.getByRole('button', { name: 'Siguiente' })
    expect(previous).toBeDisabled()
    expect(next).toBeDisabled()
    await user.click(previous)
    await user.click(next)
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('renders nothing when there is a single page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
