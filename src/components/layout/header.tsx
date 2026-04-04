import { Menu, Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Breadcrumbs } from './breadcrumbs'

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { theme, toggle: toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  const initials = user
    ? `${user.profile.first_name[0] ?? ''}${user.profile.last_name[0] ?? ''}`.toUpperCase()
    : 'AD'

  const fullName = user
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : 'Administrador'

  return (
    <header className="flex items-center h-16 px-4 border-b border-border bg-background shrink-0 gap-4">
      {/* Hamburger */}
      <Button variant="ghost" size="icon" onClick={onMenuToggle} className="shrink-0">
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumbs */}
      <div className="flex-1 min-w-0">
        <Breadcrumbs />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Cambiar tema">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-auto px-2 py-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profile.avatar_url ?? undefined} alt={fullName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium">{fullName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{fullName}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-status-error focus:text-status-error"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
