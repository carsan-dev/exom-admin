import { Link, useLocation } from 'react-router'
import { useClientProfile } from '@/features/clients/api'
import { getUserDisplayName } from '@/features/clients/types'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const baseRouteLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clientes',
  users: 'Usuarios',
  exercises: 'Ejercicios',
  trainings: 'Entrenamientos',
  badges: 'Badges',
  ingredients: 'Ingredientes',
  diets: 'Dietas',
  assignments: 'Asignaciones',
  progress: 'Progreso',
  feedback: 'Feedback',
  recaps: 'Recaps',
  challenges: 'Retos',
  achievements: 'Logros',
  notifications: 'Notificaciones',
  'notification-templates': 'Plantillas',
  'approval-requests': 'Solicitudes',
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const currentUserRole = useAuth((state) => state.user?.role)
  const segments = pathname.split('/').filter(Boolean)
  const clientId = segments[0] === 'clients' || segments[0] === 'users' ? segments[1] : undefined
  const clientProfile = useClientProfile(clientId)
  const routeLabels: Record<string, string> = {
    ...baseRouteLabels,
    clients: currentUserRole === 'SUPER_ADMIN' ? 'Usuarios' : 'Clientes',
  }

  if (segments.length === 0) return null

  return (
    <nav aria-label="Migas de pan" className="min-w-0 text-[13px]">
      <ol className="flex min-w-0 items-center gap-1.5">
        {segments.map((segment, idx) => {
          const isLast = idx === segments.length - 1
          const to = '/' + segments.slice(0, idx + 1).join('/')
          const label =
            clientId && idx === 1
              ? clientProfile.data
                ? getUserDisplayName(clientProfile.data)
                : 'Detalle'
              : routeLabels[segment] ?? segment

          return (
            <li
              key={to}
              className={cn('flex items-center gap-1.5 whitespace-nowrap', isLast ? 'min-w-0' : 'shrink-0')}
            >
              {idx > 0 && (
                <span aria-hidden="true" className="text-border-strong">
                  /
                </span>
              )}
              {isLast ? (
                <span aria-current="page" className="min-w-0 truncate text-foreground">
                  {label}
                </span>
              ) : (
                <Link
                  to={to}
                  className="text-muted-foreground transition-colors duration-(--dur-fast) ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
