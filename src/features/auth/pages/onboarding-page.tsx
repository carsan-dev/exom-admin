import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function OnboardingPage() {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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
    <div className="flex min-h-screen min-h-[100svh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl font-black tracking-widest text-brand-primary">EXOM</span>
          <p className="text-sm text-muted-foreground">Completa tu perfil para continuar</p>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-0">
            <h2 className="text-xl font-semibold text-foreground">Bienvenido</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {user?.email}
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {error && (
                <div className="rounded-md border border-status-error/30 bg-status-error/10 p-3 text-sm text-status-error">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="firstName">
                  Nombre
                </label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Tu nombre"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="lastName">
                  Apellidos
                </label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Tus apellidos"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Continuar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
