import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'

export interface NotFoundPageProps {
  /** Destino de la acción principal. Por defecto, el Dashboard. */
  homeHref?: string
  homeLabel?: string
}

export function NotFoundPage({ homeHref = '/dashboard', homeLabel = 'Ir al Dashboard' }: NotFoundPageProps) {
  const navigate = useNavigate()

  return (
    <section
      aria-labelledby="not-found-title"
      className="mx-auto flex w-full max-w-[880px] flex-col justify-center gap-6 py-12 md:min-h-[60svh]"
    >
      <p aria-hidden="true" className="font-display text-[96px] font-extrabold leading-none text-foreground-secondary md:text-[144px]">
        404
      </p>
      <div>
        <h1 id="not-found-title" className="font-display text-[34px] font-extrabold leading-tight text-foreground md:text-[44px]">
          Página no encontrada
        </h1>
        <p className="mt-4 max-w-[42ch] text-sm leading-[22px] text-foreground-secondary">
          La dirección que has abierto no existe o ya no está disponible.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link to={homeHref}>{homeLabel}</Link>
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    </section>
  )
}
