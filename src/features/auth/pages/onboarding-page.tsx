import { useState } from 'react'
import { ArrowRight, CircleAlert } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function OnboardingPage() {
  const { user } = useAuth()
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
      <div className="relative isolate min-h-24 overflow-hidden bg-[#090a09] text-[#b7bcb3] lg:min-h-full" aria-hidden="true">
        <span className="absolute left-[-30%] top-1/2 z-0 h-0.5 w-[150%] -rotate-[7deg] bg-[#baf23a] lg:top-[46%] lg:w-[160%] lg:-rotate-12" />
        <span className="absolute left-[-30%] top-1/2 z-0 h-0.5 w-[150%] rotate-[7deg] bg-[#baf23a] lg:top-[46%] lg:w-[160%] lg:rotate-12" />
        <span className="pointer-events-none absolute bottom-[calc(72px-0.2em)] left-[-0.07em] z-[1] hidden select-none whitespace-nowrap font-display text-[clamp(220px,29vw,420px)] font-extrabold uppercase leading-[0.8] tracking-[-0.04em] text-[#dfe0d4]/10 lg:block">
          E<span className="text-[#baf23a]">X</span>OM
        </span>
        <p className="absolute inset-0 z-[2] flex items-center gap-3 px-5 text-[13px] leading-5 lg:inset-x-0 lg:bottom-0 lg:top-auto lg:h-[72px] lg:gap-2.5 lg:border-t lg:border-[#272b25] lg:bg-[#090a09] lg:px-10">
          <span className="font-display text-[40px] font-extrabold uppercase leading-none tracking-[-0.04em] text-[#f2f1e9] lg:hidden">
            E<span className="text-[#baf23a]">X</span>OM
          </span>
          <span className="hidden lg:inline">Panel de administración EXOM</span>
        </p>
      </div>

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
        </div>
      </main>
    </div>
  )
}
