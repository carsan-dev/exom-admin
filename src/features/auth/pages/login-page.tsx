import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { sendPasswordResetEmail } from 'firebase/auth'
import { Eye, EyeOff, AlertCircle, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { auth } from '@/lib/firebase'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login, loginWithGoogle, error, isLoading, isAuthenticated, clearError } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (data: LoginForm) => {
    login(data.email, data.password)
  }

  const handleForgotPassword = async () => {
    const isEmailValid = await trigger('email')

    if (!isEmailValid) {
      return
    }

    const email = getValues('email').trim().toLowerCase()

    setIsSendingReset(true)

    try {
      await sendPasswordResetEmail(auth, email)
      toast.success('Si el email existe, recibirá un enlace para restablecer la contraseña.')
    } catch (error) {
      const errorCode = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : null

      if (errorCode === 'auth/too-many-requests') {
        toast.error('Demasiados intentos. Inténtalo más tarde.')
      } else if (errorCode === 'auth/network-request-failed') {
        toast.error('No se ha podido solicitar el restablecimiento. Revisa tu conexión e inténtalo de nuevo.')
      } else {
        // Mantiene el mismo comportamiento genérico para no revelar si el email existe.
        toast.success('Si el email existe, recibirá un enlace para restablecer la contraseña.')
      }
    } finally {
      setIsSendingReset(false)
    }
  }

  const isBlocked = error === 'ACCOUNT_BLOCKED'
  const isUnauthorized = error === 'UNAUTHORIZED'

  return (
    <div className="flex min-h-screen min-h-[100svh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-black tracking-widest text-brand-primary">EXOM</span>
          </div>
          <p className="text-sm text-muted-foreground">Panel de administración</p>
        </div>

        {/* Blocked state */}
        {isBlocked ? (
          <Card className="border-status-warning/50 bg-background-surface">
            <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-status-warning/10 p-4">
                <Lock className="h-8 w-8 text-status-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Cuenta bloqueada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tu cuenta ha sido desactivada. Contacta con el administrador del sistema.
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={clearError}>
                  Volver
                </Button>
                <Button className="flex-1" asChild>
                  <a href="mailto:soporte@exom.app">Contactar entrenador</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardHeader className="pb-0">
              <h2 className="text-xl font-semibold text-foreground">Iniciar sesión</h2>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* General error */}
              {error && !isBlocked && (
                <div className="flex items-center gap-2 rounded-md border border-status-error/30 bg-status-error/10 p-3 text-sm text-status-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    {isUnauthorized
                      ? 'Acceso no autorizado. Solo administradores pueden entrar.'
                      : error}
                  </span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="email">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@exom.app"
                    autoComplete="email"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-status-error">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="password">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="pr-10"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-status-error">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    disabled={isSendingReset}
                    className="text-xs text-brand-primary hover:text-brand-secondary transition-colors"
                  >
                    {isSendingReset ? 'Enviando enlace...' : '¿Has olvidado tu contraseña?'}
                  </button>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs text-muted-foreground">
                  <span className="bg-card px-2">O continúa con</span>
                </div>
              </div>

              {/* Social buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  type="button"
                  disabled={isLoading}
                  onClick={() => loginWithGoogle()}
                  className="gap-2"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  disabled={isLoading}
                  className="gap-2 opacity-50 cursor-not-allowed"
                  title="Próximamente"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Apple
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
