import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { Form, FormControl, FormField, FormItem, FormLabel } from './form'
import { Label } from './label'

type Values = { name: string; notes: string }

function TestForm() {
  const form = useForm<Values>({ defaultValues: { name: '', notes: '' } })

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem required>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

/** RDS-F5-A11Y-15: marca visible de obligatorio oculta a lectores y aria-required en el control. */
describe('campos obligatorios', () => {
  it('FormItem required marca la etiqueta y expone aria-required sin cambiar el nombre accesible', () => {
    render(<TestForm />)

    const name = screen.getByRole('textbox', { name: 'Nombre' })
    expect(name).toBeRequired()
    expect(name).toHaveAttribute('aria-required', 'true')
    expect(name).not.toHaveAttribute('required')
    expect(screen.getByLabelText('Nombre')).toBe(name)

    const label = screen.getByText('Nombre')
    const mark = label.querySelector('[data-required-mark]')
    expect(mark).not.toBeNull()
    expect(mark).toHaveAttribute('aria-hidden', 'true')
    expect(mark).toHaveClass('text-destructive')

    const notes = screen.getByRole('textbox', { name: 'Notas' })
    expect(notes).not.toBeRequired()
    expect(notes).not.toHaveAttribute('aria-required')
    expect(screen.getByText('Notas').querySelector('[data-required-mark]')).toBeNull()
  })

  it('Label asChild sin required no lanza y renderiza su único hijo (H-1)', () => {
    expect(() =>
      render(
        <Label asChild>
          <span>Etiqueta compuesta</span>
        </Label>,
      ),
    ).not.toThrow()
    const label = screen.getByText('Etiqueta compuesta')
    expect(label.tagName).toBe('SPAN')
    expect(label.querySelector('[data-required-mark]')).toBeNull()
  })

  it('Label required pinta la marca sin alterar el nombre accesible del control', () => {
    render(
      <>
        <Label htmlFor="titulo" required>
          Título
        </Label>
        <input id="titulo" aria-required="true" />
      </>,
    )

    const input = screen.getByRole('textbox', { name: 'Título' })
    expect(input).toBeRequired()
    expect(screen.getByLabelText('Título')).toBe(input)
    expect(screen.getByText('Título').querySelector('[data-required-mark]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })
})
