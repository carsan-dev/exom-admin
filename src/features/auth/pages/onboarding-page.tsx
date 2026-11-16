import { useState } from 'react'
import { ArrowRight, CircleAlert } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthBrandPanel } from '../components/auth-brand-panel'

export function OnboardingPage() {
  const { user, logout } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  useUnsavedChanges('onboarding-form', Boolean(firstName || lastName || isSubmitting))
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim()) {
      setError('Nombre y apellidos son obligatorios')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await api.put('/profile/me', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })

      // Full reload so initialize() fetches the new profile cleanly
      // Avoids race conditions with onAuthStateChanged
      window.location.replace('/dashboard')
    } catch {
      setError('Error al guardar el perfil. Inténtalo de nuevo.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[96px_minmax(0,1fr)] bg-background lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:grid-rows-1">
      <AuthBrandPanel />

      <main className="flex min-w-0 items-start justify-center px-4 py-8 md:px-5 md:py-10 lg:items-center lg:px-8 lg:py-12">
        <div className="w-full max-w-[380px]">
          <h1 className="font-display text-[38px] font-extrabold uppercase leading-[0.92] text-foreground md:text-[44px]">
            Bienvenido
          </h1>
          <p className="mt-3 break-words text-[13px] leading-5 text-foreground-secondary">{user?.email}</p>
          <p className="mt-0.5 text-[13px] leading-5 text-foreground-secondary">
            Completa tu perfil para continuar
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-5">
            <div aria-live="polite">
              {error && (
                <div
                  role="alert"
                  className="flex min-h-11 items-center gap-3 border border-status-error/45 bg-status-error/10 px-4 py-2 text-[13px] leading-5 text-foreground"
                >
                  <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-status-error" />
                  <span className="min-w-0 flex-1">{error}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="firstName">
                Nombre
              </label>
              <Input
                id="firstName"
                type="text"
                placeholder="Tu nombre"
                autoComplete="given-name"
                className="h-11"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="lastName">
                Apellidos
              </label>
              <Input
                id="lastName"
                type="text"
                placeholder="Tus apellidos"
                autoComplete="family-name"
                className="h-11"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <Button type="submit" size="lg" className="mt-7 w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Continuar'}
              {!isSubmitting && <ArrowRight aria-hidden="true" />}
            </Button>
          </form>

          <p className="mt-7 flex items-center justify-center">
            <button
              type="button"
              onClick={() => void logout()}
              disabled={isSubmitting}
              className="relative inline-flex min-h-11 items-center px-2 text-[13px] leading-5 text-foreground-secondary underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-(--dur-fast) ease-(--ease-out) hover:text-foreground hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:text-muted-foreground"
            >
              Cerrar sesión
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
