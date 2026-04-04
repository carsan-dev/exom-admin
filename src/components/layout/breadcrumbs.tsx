import { Link, useLocation } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { useClientProfile } from '@/features/clients/api'
import { getUserDisplayName } from '@/features/clients/types'
import { useAuth } from '@/hooks/use-auth'

const baseRouteLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clientes',
  users: 'Usuarios',
  exercises: 'Ejercicios',
  trainings: 'Entrenamientos',
  ingredients: 'Ingredientes',
  diets: 'Dietas',
  assignments: 'Asignaciones',
  progress: 'Progreso',
  feedback: 'Feedback',
  recaps: 'Recaps',
  challenges: 'Retos',
  achievements: 'Logros',
  notifications: 'Notificaciones',
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
    <nav className="flex items-center gap-1 text-sm">
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
          <span key={to} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link to={to} className="text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
