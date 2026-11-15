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
import { Link } from 'react-router'
import { Breadcrumbs } from './breadcrumbs'
import { BrandSymbol } from './brand-symbol'

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { theme, toggle: toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  const initials = user?.profile
    ? `${user.profile.first_name[0] ?? ''}${user.profile.last_name[0] ?? ''}`.toUpperCase()
    : 'AD'

  const fullName = user?.profile
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : 'Administrador'

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border bg-background px-3">
      <Link
        to="/dashboard"
        aria-label="EXOM Admin, ir al Dashboard"
        className="flex shrink-0 items-center gap-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:hidden"
      >
        <BrandSymbol />
        <span
          aria-hidden="true"
          className="font-display text-[20px] font-bold uppercase leading-none tracking-wide text-foreground"
        >
          EXOM
        </span>
      </Link>

      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuToggle}
        aria-label="Mostrar u ocultar el menú"
        className="hidden shrink-0 lg:inline-flex"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1 max-md:invisible">
        <Breadcrumbs />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title="Cambiar tema"
          aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        >
          {theme === 'dark' ? (
            <Sun aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Moon aria-hidden="true" className="h-5 w-5" />
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              aria-label={`Menú de usuario: ${fullName}`}
              className="h-10 gap-2 px-2 py-0"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.profile?.avatar_url ?? undefined} alt={fullName} />
                <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-[13px] font-semibold sm:block">{fullName}</span>
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
