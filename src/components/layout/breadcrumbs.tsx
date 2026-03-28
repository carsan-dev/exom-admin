import { Link, useLocation } from 'react-router'
import { ChevronRight } from 'lucide-react'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clientes',
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
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-sm">
      {segments.map((segment, idx) => {
        const isLast = idx === segments.length - 1
        const to = '/' + segments.slice(0, idx + 1).join('/')
        const label = routeLabels[segment] ?? segment

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
