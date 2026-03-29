import { Fragment } from 'react'
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
      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-4">
        {navItems.map(({ to, label, icon: Icon }, index) => (
          <Fragment key={to}>
            {isOpen ? (
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex w-full items-center rounded-none border-l-2 border-transparent px-3 py-2 text-left text-sm font-medium transition-colors',
                    'hover:bg-brand-soft/30 hover:text-foreground',
                    index === 0 && 'rounded-t-md',
                    index === navItems.length - 1 && 'rounded-b-md',
                    isActive && 'border-brand-primary bg-brand-primary/10 text-brand-primary',
                    !isActive && 'text-foreground/70'
                  )
                }
              >
                <span className="grid w-full min-w-0 grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center">
                    <Icon className="h-5 w-5 shrink-0" />
                  </span>
                  <span className="truncate whitespace-nowrap leading-none">{label}</span>
                </span>
              </NavLink>
            ) : (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex h-10 w-full items-center justify-center rounded-none px-0 text-sm font-medium transition-colors',
                        'hover:bg-brand-soft/30 hover:text-foreground',
                        index === 0 && 'rounded-t-md',
                        index === navItems.length - 1 && 'rounded-b-md',
                        isActive && 'bg-brand-primary/10 text-brand-primary',
                        !isActive && 'text-foreground/70'
                      )
                    }
                  >
                    <span className="grid w-full place-items-center">
                      <Icon className="h-5 w-5 shrink-0" />
                    </span>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </Fragment>
        ))}
      </nav>
    </aside>
  )
}
