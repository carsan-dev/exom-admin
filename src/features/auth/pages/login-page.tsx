import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { sendPasswordResetEmail } from 'firebase/auth'
import { ArrowRight, Eye, EyeOff, AlertCircle, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

  return (
    <div className="grid min-h-screen min-h-[100svh] grid-cols-1 grid-rows-[96px_minmax(0,1fr)] bg-background lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:grid-rows-1">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:outline-2 focus:outline-focus"
      >
        Saltar al contenido
      </a>

      {/* Panel de marca: siempre oscuro en ambos temas */}
      <div className="relative isolate min-h-24 overflow-hidden bg-[#090a09] text-[#b7bcb3] lg:min-h-full">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
          <span className="absolute left-0 top-1/2 h-0.5 w-[150%] origin-center -rotate-[7deg] bg-brand-primary lg:-left-[30%] lg:top-[46%] lg:w-[160%] lg:-rotate-12" />
          <span className="absolute left-0 top-1/2 h-0.5 w-[150%] origin-center rotate-[7deg] bg-brand-primary lg:-left-[30%] lg:top-[46%] lg:w-[160%] lg:rotate-12" />
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[calc(72px-0.2em)] -left-[0.07em] z-[1] hidden select-none whitespace-nowrap font-display text-[clamp(220px,29vw,420px)] font-extrabold uppercase leading-[0.8] tracking-[-0.04em] text-[#dfe0d4]/10 lg:block"
        >
          E<span className="text-brand-primary">X</span>OM
        </span>
        <p className="absolute inset-0 z-[2] flex items-center gap-3 px-5 text-[13px] leading-5 text-[#b7bcb3] lg:inset-x-0 lg:bottom-0 lg:top-auto lg:h-[72px] lg:gap-2.5 lg:border-t lg:border-[#272b25] lg:bg-[#090a09] lg:px-10">
          <svg viewBox="0 0 120 112" aria-hidden="true" focusable="false" className="h-6 w-[26px] shrink-0 lg:h-[21px] lg:w-[22px]">
            <path
              fill="#f2f1e9"
              d="M46 110C20 106 0 84 0 56C0 33 14 12 35 3C48-2 60 4 62 16C66 29 57 39 44 39C36 39 28 35 23 28C11 38 5 51 7 65C9 86 24 103 46 109Z"
            />
            <path
              fill="#baf23a"
              transform="rotate(180 60 56)"
              d="M46 110C20 106 0 84 0 56C0 33 14 12 35 3C48-2 60 4 62 16C66 29 57 39 44 39C36 39 28 35 23 28C11 38 5 51 7 65C9 86 24 103 46 109Z"
            />
          </svg>
          <span
            aria-hidden="true"
            className="font-display text-[40px] font-extrabold uppercase leading-none tracking-[-0.04em] text-[#f2f1e9] lg:hidden"
          >
            E<span className="text-brand-primary">X</span>OM
          </span>
          <span className="max-lg:sr-only">Panel de administración EXOM</span>
        </p>
      </div>

      <main
        id="auth-main"
        className="flex min-w-0 items-start justify-center px-4 py-8 md:px-5 md:py-10 lg:items-center lg:px-8 lg:py-12"
      >
        <div className="w-full max-w-[380px]">
          {/* Blocked state */}
          {isBlocked ? (
            <section aria-labelledby="blocked-title">
              <Lock className="mb-5 h-6 w-6 text-status-warning" aria-hidden="true" />
              <h1
                id="blocked-title"
                className="font-display text-[38px] font-extrabold uppercase leading-[0.92] text-foreground md:text-[44px]"
              >
                Cuenta bloqueada
              </h1>
              <p className="mt-3 max-w-[34ch] text-sm leading-[22px] text-foreground-secondary">
                Tu cuenta ha sido desactivada. Contacta con el administrador del sistema.
              </p>
              <div className="mt-8 flex flex-col gap-2">
                <Button size="lg" className="h-11 w-full" asChild>
                  <a href="mailto:soporte@exom.app">Contactar entrenador</a>
                </Button>
                <Button variant="secondary" size="lg" className="h-11 w-full" onClick={clearError}>
                  Volver
                </Button>
              </div>
            </section>
          ) : (
            <>
              <h1 className="font-display text-[38px] font-extrabold uppercase leading-[0.92] text-foreground md:text-[44px]">
                Iniciar sesión
              </h1>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
                {/* General error */}
                {error && !isBlocked && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 border border-status-error/30 bg-status-error-soft p-3 text-sm text-status-error"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      {isUnauthorized
                        ? 'Acceso no autorizado. Solo administradores pueden entrar.'
                        : error}
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="email">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@exom.app"
                    autoComplete="email"
                    inputMode="email"
                    className="h-11"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-status-error">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground" htmlFor="password">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="h-11 pr-12"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-controls="password"
                        aria-pressed={showPassword}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute inset-y-px right-px grid w-11 place-items-center text-foreground-muted transition-colors hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-status-error">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="mt-2.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleForgotPassword()}
                      disabled={isSendingReset}
                      className={`relative text-[13px] font-semibold leading-5 text-accent-text underline decoration-transparent underline-offset-[3px] transition-[text-decoration-color,color] hover:decoration-current disabled:text-foreground-muted after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] ${focusRing}`}
                    >
                      {isSendingReset ? 'Enviando enlace...' : '¿Has olvidado tu contraseña?'}
                    </button>
                  </div>
                </div>

                <Button type="submit" size="lg" className="mt-7 h-11 w-full" disabled={isLoading}>
                  {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                  {!isLoading && <ArrowRight aria-hidden="true" />}
                </Button>
              </form>

              {/* Divider */}
              <div className="mb-5 mt-7 flex items-center gap-3 text-xs leading-4 text-foreground-muted">
                <span aria-hidden="true" className="h-px flex-1 bg-border-strong" />
                <span>O continúa con</span>
                <span aria-hidden="true" className="h-px flex-1 bg-border-strong" />
              </div>

              {/* Social buttons */}
              <div>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={isLoading}
                  onClick={() => loginWithGoogle()}
                  className="h-11 w-full gap-2"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true" focusable="false">
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
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
