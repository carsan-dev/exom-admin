import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ClipboardList,
  Apple,
  UtensilsCrossed,
  CalendarDays,
  TrendingUp,
  MessageSquare,
  FileText,
  Trophy,
  Award,
  Bell,
  Settings,
  ShieldCheck,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import { getUsersRoute } from '@/features/clients/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  superAdminOnly?: boolean
}

export interface NavGroup {
  id: string
  /** null: grupo sin etiqueta visible (el primero). */
  label: string | null
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'inicio',
    label: null,
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'seguimiento',
    label: 'Seguimiento',
    items: [
      { to: '/clients', label: 'Clientes', icon: Users },
      { to: '/progress', label: 'Progreso', icon: TrendingUp },
      { to: '/feedback', label: 'Feedback', icon: MessageSquare },
      { to: '/recaps', label: 'Recaps', icon: FileText },
    ],
  },
  {
    id: 'planificacion',
    label: 'Planificación',
    items: [
      { to: '/assignments', label: 'Asignaciones', icon: CalendarDays },
      { to: '/trainings', label: 'Entrenamientos', icon: ClipboardList },
      { to: '/diets', label: 'Dietas', icon: UtensilsCrossed },
    ],
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    items: [
      { to: '/exercises', label: 'Ejercicios', icon: Dumbbell },
      { to: '/ingredients', label: 'Ingredientes', icon: Apple },
      { to: '/badges', label: 'Etiquetas', icon: Tags },
    ],
  },
  {
    id: 'motivacion',
    label: 'Motivación',
    items: [
      { to: '/challenges', label: 'Retos', icon: Trophy },
      { to: '/achievements', label: 'Logros', icon: Award },
    ],
  },
  {
    id: 'comunicacion',
    label: 'Comunicación',
    items: [
      { to: '/notifications', label: 'Notificaciones', icon: Bell },
      { to: '/notification-templates', label: 'Plantillas', icon: Settings, superAdminOnly: true },
    ],
  },
  {
    id: 'control',
    label: 'Control',
    items: [{ to: '/approval-requests', label: 'Solicitudes', icon: ShieldCheck }],
  },
]

/** Resuelve la navegacion visible para un rol; los grupos vacios se omiten. */
export function resolveNavGroups(role: string | undefined): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => !item.superAdminOnly || role === 'SUPER_ADMIN')
      .map((item) =>
        item.to === '/clients' && role === 'SUPER_ADMIN'
          ? { ...item, to: getUsersRoute(role), label: 'Usuarios' }
          : item,
      ),
  })).filter((group) => group.items.length > 0)
}
