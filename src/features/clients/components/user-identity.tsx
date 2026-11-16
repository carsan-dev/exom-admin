import type { ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from './user-display'

interface UserIdentityProps {
  user: Parameters<typeof getInitials>[0] & { profile?: { avatar_url?: string | null } | null }
  name: string
  /** Línea bajo el nombre; se trunca. */
  subtitle: ReactNode
  /** Contenido junto al nombre (p. ej. la marca «Tú»). */
  badge?: ReactNode
  /** Líneas extra bajo el subtítulo (solo visibles cuando la columna se oculta). */
  children?: ReactNode
}

/** Avatar + nombre + subtítulo. Nombres y emails largos truncan o parten sin desbordar. */
export function UserIdentity({ user, name, subtitle, badge, children }: UserIdentityProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-10 w-10 border border-border/60">
        <AvatarImage src={user.profile?.avatar_url ?? undefined} alt={name} />
        <AvatarFallback>{getInitials(user)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 max-w-full font-medium text-foreground [overflow-wrap:anywhere]">{name}</p>
          {badge}
        </div>
        <p className="text-sm text-foreground-secondary [overflow-wrap:anywhere]">{subtitle}</p>
        {children}
      </div>
    </div>
  )
}
