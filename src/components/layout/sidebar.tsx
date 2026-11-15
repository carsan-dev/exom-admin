import { useId } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApprovalStats } from '@/features/approval-requests/api'
import { BrandSymbol } from './brand-symbol'
import { resolveNavGroups, type NavItem } from './nav-model'

interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
}

interface SidebarLinkProps {
  item: NavItem
  count: number | null
  isOpen: boolean
  onClose?: () => void
}

function SidebarLink({ item, count, isOpen, onClose }: SidebarLinkProps) {
  const { to, label, icon: Icon } = item

  const link = (
    <NavLink
      to={to}
      onClick={onClose}
      // Clases en cadena y estado activo por `aria-current`: en carril el enlace va
      // dentro de `TooltipTrigger asChild`, que convierte en texto un `className` función.
      className={cn(
        'group relative flex h-11 w-full select-none items-center gap-3 whitespace-nowrap px-[18px] text-sm md:h-9',
        'transition-colors duration-(--dur-fast) ease-out',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
        'hover:bg-background-surface',
        'aria-[current=page]:bg-lime-soft',
      )}
    >
      <>
          <Icon
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-muted-foreground group-aria-[current=page]:text-accent-line"
          />
          <span
            className={cn(
              'text-foreground-secondary transition-colors duration-(--dur-fast) ease-out group-hover:text-foreground group-aria-[current=page]:text-foreground',
              isOpen ? 'min-w-0 flex-1 truncate' : 'sr-only',
            )}
          >{label}</span>
          {count !== null ? (
            <span
              aria-label={`${count} pendientes`}
              className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center border border-border-strong px-1.5 text-[11px] font-semibold leading-none tabular-nums text-foreground',
                isOpen ? 'ml-auto' : 'absolute left-7 top-1 h-4 min-w-4 px-1',
              )}
            >
              {count}
            </span>
          ) : null}
      </>
    </NavLink>
  )

  if (isOpen) return link

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        <p>{count !== null ? `${label} (${count})` : label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const baseId = useId()
  const currentUserRole = useAuth((state) => state.user?.role)
  const approvalStatsQuery = useApprovalStats(currentUserRole === 'SUPER_ADMIN')
  const pendingApprovals = approvalStatsQuery.data?.pending ?? 0
  const groups = resolveNavGroups(currentUserRole)

  return (
    <aside
      data-state={isOpen ? 'expanded' : 'rail'}
      className={cn(
        'flex h-full flex-col overflow-hidden border-r border-border bg-background-secondary',
        'transition-[width] duration-(--dur-base) ease-out',
        isOpen ? 'w-60' : 'w-14',
      )}
    >
      {/* Lockup */}
      <div
        className={cn(
          'flex h-[52px] shrink-0 items-center gap-2 whitespace-nowrap border-b border-border',
          isOpen ? 'pl-[18px]' : 'justify-center',
        )}
      >
        <BrandSymbol />
        {isOpen ? (
          <>
            <span className="font-display text-[22px] font-bold uppercase leading-none tracking-wide text-foreground">
              EXOM
            </span>
            <span className="pt-[3px] text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Admin
            </span>
          </>
        ) : null}
      </div>

      <nav
        aria-label="Principal"
        className="flex-1 overflow-y-auto overflow-x-hidden py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((group, index) => {
          const labelId = `${baseId}-${group.id}`
          return (
            <div key={group.id} className={cn(index > 0 && 'mt-3')}>
              {group.label ? (
                <p
                  id={labelId}
                  className={cn(
                    'flex h-7 items-center',
                    isOpen
                      ? 'whitespace-nowrap px-5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground'
                      : 'justify-center',
                  )}
                >
                  {isOpen ? (
                    group.label
                  ) : (
                    <>
                      <span className="sr-only">{group.label}</span>
                      <span aria-hidden="true" className="h-px w-4 bg-border-strong" />
                    </>
                  )}
                </p>
              ) : null}
              <ul aria-labelledby={group.label ? labelId : undefined}>
                {group.items.map((item) => (
                  <li key={item.to}>
                    <SidebarLink
                      item={item}
                      count={
                        item.to === '/approval-requests' &&
                        currentUserRole === 'SUPER_ADMIN' &&
                        pendingApprovals > 0
                          ? pendingApprovals
                          : null
                      }
                      isOpen={isOpen}
                      onClose={onClose}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
