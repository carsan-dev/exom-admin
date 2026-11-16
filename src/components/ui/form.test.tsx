import { act, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form'

type Values = { name: string }

let setFieldError: ((message: string) => void) | null = null

function TestForm({ withDescription, withMessage }: { withDescription: boolean; withMessage: boolean }) {
  const form = useForm<Values>({ defaultValues: { name: '' } })
  setFieldError = (message) => form.setError('name', { type: 'manual', message })

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <input {...field} />
              </FormControl>
              {withDescription ? <FormDescription>Ayuda del campo</FormDescription> : null}
              {withMessage ? <FormMessage /> : null}
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

function TwoDescriptionsForm({ showSecond }: { showSecond: boolean }) {
  const form = useForm<Values>({ defaultValues: { name: '' } })

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <input {...field} />
              </FormControl>
              <FormDescription>Primera ayuda</FormDescription>
              {showSecond ? <FormDescription className="sr-only">Segunda ayuda</FormDescription> : null}
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

/** Cada id de aria-describedby debe existir en el documento (RDS-F5-A11Y-14). */
function describedByIds(element: HTMLElement): string[] {
  return (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
}

function expectNoDanglingIds(element: HTMLElement) {
  for (const id of describedByIds(element)) {
    expect(document.getElementById(id), `id referenciado inexistente: ${id}`).not.toBeNull()
  }
}

describe('FormControl aria-describedby', () => {
  it('no referencia una descripción que no se renderiza', () => {
    render(<TestForm withDescription={false} withMessage />)
    const input = screen.getByLabelText('Nombre')
    expectNoDanglingIds(input)
    expect(describedByIds(input)).toHaveLength(0)
  })

  it('referencia la descripción cuando existe', () => {
    render(<TestForm withDescription withMessage />)
    const input = screen.getByLabelText('Nombre')
    expectNoDanglingIds(input)
    expect(input).toHaveAccessibleDescription('Ayuda del campo')
  })

  it('con error referencia el mensaje renderizado y no ids colgantes', async () => {
    render(<TestForm withDescription={false} withMessage />)
    await act(async () => setFieldError?.('Campo obligatorio'))
    const input = screen.getByLabelText('Nombre')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expectNoDanglingIds(input)
    expect(input).toHaveAccessibleDescription('Campo obligatorio')
  })

  it('con dos FormDescription, desmontar una no deja de referenciar la otra (H-3)', () => {
    const { rerender } = render(<TwoDescriptionsForm showSecond />)
    const input = screen.getByLabelText('Nombre')
    expect(describedByIds(input)).toHaveLength(1)

    rerender(<TwoDescriptionsForm showSecond={false} />)
    expect(screen.getByText('Primera ayuda')).toBeInTheDocument()
    expectNoDanglingIds(input)
    expect(input).toHaveAccessibleDescription('Primera ayuda')
  })

  it('con error sin FormMessage no deja el id del mensaje colgante', async () => {
    render(<TestForm withDescription withMessage={false} />)
    await act(async () => setFieldError?.('Campo obligatorio'))
    const input = screen.getByLabelText('Nombre')
    expectNoDanglingIds(input)
    expect(input).toHaveAccessibleDescription('Ayuda del campo')
  })
})
