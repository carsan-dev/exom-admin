import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultScheduleDraft, emptyDraft } from '../template-helpers'
import type { NotificationTemplate } from '../types'
import { TemplateEditorForm } from './template-editor-form'

const template: NotificationTemplate = {
  key: 'manual_note',
  name: 'Nota manual',
  description: '',
  category: 'general',
  title: 'Hola',
  body: 'Cuerpo',
  route: null,
  enabled: true,
  variables: [],
  variable_help: {},
  delivery_info: { type: 'manual', label: 'Manual', description: '' },
  customized: false,
  is_system: false,
  updated_at: null,
}

function renderForm() {
  return render(
    <TemplateEditorForm
      selectedTemplate={template}
      draft={emptyDraft}
      setDraft={vi.fn()}
      scheduleDraft={defaultScheduleDraft}
      setScheduleDraft={vi.fn()}
      isBusy={false}
      isSaving={false}
      hasChanges={false}
      handleSubmit={vi.fn()}
      handleResetOrDelete={vi.fn()}
    />,
  )
}

/** RDS-F5-A11Y-03 / H-7: «Cuerpo» se recoloca solo con foco de teclado, no al pulsarlo. */
describe('TemplateEditorForm foco de «Cuerpo»', () => {
  const original = Element.prototype.scrollIntoView

  afterEach(() => {
    Element.prototype.scrollIntoView = original
  })

  it('con teclado desplaza la caja a la vista', () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    renderForm()

    fireEvent.focus(screen.getByLabelText('Cuerpo'))
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('al pulsar con puntero no provoca salto', () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    renderForm()

    const body = screen.getByLabelText('Cuerpo')
    fireEvent.pointerDown(body)
    fireEvent.focus(body)
    expect(scroll).not.toHaveBeenCalled()

    fireEvent.blur(body)
    fireEvent.focus(body)
    expect(scroll).toHaveBeenCalledTimes(1)
  })

  it('un toque cancelado sin foco no suprime el desplazamiento de un foco de teclado posterior', () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    renderForm()

    const body = screen.getByLabelText('Cuerpo')
    fireEvent.pointerDown(body)
    fireEvent.pointerCancel(body)
    fireEvent.focus(body)
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('un clic sin foco (barra de desplazamiento) no suprime el desplazamiento de un foco de teclado posterior', () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    renderForm()

    const body = screen.getByLabelText('Cuerpo')
    fireEvent.pointerDown(body)
    fireEvent.pointerUp(body)
    fireEvent.focus(body)
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest' })
  })
})
