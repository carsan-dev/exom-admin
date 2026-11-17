import { useId, type ReactNode } from 'react'

interface UsersListSectionProps {
  title: string
  description: string
  children: ReactNode
}

/** Encabezado de listado sin tarjeta: título, descripción y contenido a sangre. */
export function UsersListSection({ title, description, children }: UsersListSectionProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="min-w-0 space-y-4">
      <div>
        <h2 id={titleId} className="font-display text-lg font-bold uppercase leading-none text-foreground">
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-foreground-secondary">{description}</p>
      </div>
      {children}
    </section>
  )
}
