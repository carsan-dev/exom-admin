import { NavLink } from 'react-router'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/exercises', label: 'Ejercicios', icon: Dumbbell },
  { to: '/trainings', label: 'Entrenamientos', icon: ClipboardList },
  { to: '/ingredients', label: 'Ingredientes', icon: Apple },
  { to: '/diets', label: 'Dietas', icon: UtensilsCrossed },
  { to: '/assignments', label: 'Asignaciones', icon: CalendarDays },
  { to: '/progress', label: 'Progreso', icon: TrendingUp },
  { to: '/feedback', label: 'Feedback', icon: MessageSquare },
  { to: '/recaps', label: 'Recaps', icon: FileText },
  { to: '/challenges', label: 'Retos', icon: Trophy },
  { to: '/achievements', label: 'Logros', icon: Award },
  { to: '/notifications', label: 'Notificaciones', icon: Bell },
]

interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-background-secondary border-r border-border transition-all duration-300 overflow-hidden',
        isOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-border shrink-0',
          isOpen ? 'px-4 gap-2' : 'justify-center'
        )}
      >
        <span className="text-xl font-black tracking-widest text-brand-primary">
          {isOpen ? 'EXOM' : 'EX'}
        </span>
        {isOpen && <span className="text-xs text-muted-foreground font-medium uppercase">Admin</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Tooltip key={to} delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    'hover:bg-brand-soft/30 hover:text-foreground',
                    isActive
                      ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary pl-[6px]'
                      : 'text-muted-foreground',
                    !isOpen && 'justify-center px-2'
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {isOpen && <span>{label}</span>}
              </NavLink>
            </TooltipTrigger>
            {!isOpen && (
              <TooltipContent side="right">
                <p>{label}</p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </nav>
    </aside>
  )
}
