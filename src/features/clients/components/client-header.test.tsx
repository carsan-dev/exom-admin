import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClientHeader } from './client-header'
import type { ClientDetail } from '../types'

const client: ClientDetail = {
  id: 'fixture', email: 'fixture@example.invalid', role: 'CLIENT', is_active: true,
  is_locked: false, firebase_uid: 'synthetic', created_at: '2026-10-04T12:00:00Z',
  updated_at: '2026-10-04T12:00:00Z', profile: null, bodyMetrics: [], streak: null,
}

describe('contexto compacto del cliente', () => {
  it('conserva identidad y estado; contacto y alta son detalles recuperables', () => {
    render(<ClientHeader client={client} />)
    expect(screen.getByRole('heading', { name: client.email })).toBeInTheDocument()
    expect(screen.getByText('Cliente')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
    const summary = screen.getByText('Datos de contacto y alta')
    const details = summary.closest('details')
    expect(details).not.toHaveAttribute('open')
    fireEvent.click(summary)
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Alta')).toBeInTheDocument()
    expect(screen.getByText('04 de octubre de 2026')).toBeInTheDocument()
  })
  it('conserva los estados bloqueado e inactivo sin depender del color', () => {
    const view = render(<ClientHeader client={{ ...client, is_locked: true }} />)
    expect(screen.getByText('Bloqueada')).toBeInTheDocument()
    view.rerender(<ClientHeader client={{ ...client, is_active: false }} />)
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
  })
})
