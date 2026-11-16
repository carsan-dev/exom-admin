import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'
import { NotFoundPage } from './not-found-page'

export interface RouteErrorProps {
  /** Destino del enlace secundario. Por defecto, el Dashboard. */
  homeHref?: string
  homeLabel?: string
}

function devMessage(error: unknown): string | null {
  if (!import.meta.env.DEV) return null
  if (error instanceof Error) return error.message
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`
  return null
}

/** Pantalla completa para `errorElement`: no depende de auth ni de la API. */
export function RouteError({ homeHref = '/dashboard', homeLabel = 'Ir al Dashboard' }: RouteErrorProps) {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <main className="flex min-h-svh items-center bg-background px-5">
        <NotFoundPage homeHref={homeHref} homeLabel={homeLabel} />
      </main>
    )
  }

  const detail = devMessage(error)

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 py-12">
      <section className="flex w-full max-w-[460px] flex-col gap-6 text-center">
        <div role="alert" className="flex flex-col gap-3">
          <h1 className="font-display text-[34px] font-extrabold leading-tight text-foreground">
            No se pudo cargar la página
          </h1>
          <p className="text-sm leading-[22px] text-foreground-secondary">
            Ha ocurrido un problema al mostrar esta pantalla. Reintenta o vuelve al inicio.
          </p>
          {detail ? <p className="break-words text-xs text-muted-foreground">{detail}</p> : null}
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
          <Button asChild variant="outline">
            <Link to={homeHref}>{homeLabel}</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
