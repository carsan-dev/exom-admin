import { useId, useRef, useState } from 'react'
import { NavLink, matchPath, useLocation } from 'react-router'
import { FileText, LayoutDashboard, Menu, MessageSquare, TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useApprovalStats } from '@/features/approval-requests/api'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { resolveNavGroups, type NavGroup, type NavItem } from './nav-model'

const APPROVALS_ROUTE = '/approval-requests'

const TAB_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/feedback', label: 'Feedback', icon: MessageSquare },
  { to: '/recaps', label: 'Recaps', icon: FileText },
  { to: '/progress', label: 'Progreso', icon: TrendingUp },
] satisfies NavItem[]

const TAB_CLASS = cn(
  'group relative flex h-full w-full min-w-0 select-none flex-col items-center justify-center gap-1 text-[11px] leading-[14px]',
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
)

// El color va en los hijos: un `text-*` directo sobre un <a> pierde frente al estilo en línea de index.html.
const TAB_TEXT_CLASS =
  'text-muted-foreground transition-colors duration-(--dur-fast) ease-out group-hover:text-foreground group-aria-[current=page]:text-foreground group-data-[current=true]:text-foreground group-aria-expanded:text-foreground'

const TAB_ICON_CLASS = cn(
  'h-5 w-5 shrink-0',
  TAB_TEXT_CLASS,
  'group-aria-[current=page]:text-accent-line group-data-[current=true]:text-accent-line',
)

interface MoreLinkProps {
  item: NavItem
  count: number | null
  onNavigate: () => void
}

function MoreLink({ item, count, onNavigate }: MoreLinkProps) {
  const { to, label, icon: Icon } = item
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={cn(
        'group flex h-11 w-full select-none items-center gap-3 whitespace-nowrap px-4 text-sm',
        'transition-colors duration-(--dur-fast) ease-out',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
        'hover:bg-background-secondary',
        'aria-[current=page]:bg-lime-soft',
      )}
    >
      <Icon
        aria-hidden="true"
        className="h-5 w-5 shrink-0 text-muted-foreground group-aria-[current=page]:text-accent-line"
      />
      <span className="min-w-0 flex-1 truncate text-foreground-secondary transition-colors duration-(--dur-fast) ease-out group-hover:text-foreground group-aria-[current=page]:text-foreground">
        {label}
      </span>
      {count !== null ? (
        <span
          aria-label={`${count} pendientes`}
          className="ml-auto inline-flex h-5 min-w-5 items-center justify-center border border-border-strong px-1.5 text-[11px] font-semibold leading-none tabular-nums text-foreground"
        >
          {count}
        </span>
      ) : null}
    </NavLink>
  )
}

export function MobileTabbar() {
  const baseId = useId()
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLButtonElement | null>(null)
  const role = useAuth((state) => state.user?.role)
  const approvalStatsQuery = useApprovalStats(role === 'SUPER_ADMIN')
  const pendingApprovals = approvalStatsQuery.data?.pending ?? 0

  const onTabRoute = TAB_ITEMS.some((item) => matchPath({ path: item.to, end: false }, pathname))

  const allGroups = resolveNavGroups(role)
  const approvals = allGroups.flatMap((group) => group.items).find((item) => item.to === APPROVALS_ROUTE)
  const restGroups: NavGroup[] = allGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.to !== APPROVALS_ROUTE),
    }))
    .filter((group) => group.items.length > 0)

  const closeMore = () => setMoreOpen(false)

  return (
    <>
      <nav
        aria-label="Navegación inferior"
        className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(56px+env(safe-area-inset-bottom,0px))] grid-cols-5 border-t border-border bg-background-secondary pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      >
        {TAB_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={TAB_CLASS}>
            <Icon aria-hidden="true" className={TAB_ICON_CLASS} />
            <span className={TAB_TEXT_CLASS}>{label}</span>
          </NavLink>
        ))}
        <button
          ref={moreRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          data-current={!onTabRoute ? 'true' : undefined}
          onClick={() => setMoreOpen(true)}
          className={TAB_CLASS}
        >
          <Menu aria-hidden="true" className={TAB_ICON_CLASS} />
          <span className={TAB_TEXT_CLASS}>Más</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[85svh] flex-col gap-0 p-0"
          onCloseAutoFocus={(event) => {
            // Sin Trigger, Radix no sabe a dónde devolver el foco: se lo damos a «Más».
            event.preventDefault()
            moreRef.current?.focus()
          }}
        >
          <div className="shrink-0 border-b border-border px-4 py-3 pr-14">
            <SheetTitle>Menú</SheetTitle>
            <SheetDescription className="sr-only">Todas las secciones del panel</SheetDescription>
          </div>
          <nav
            aria-label="Todas las secciones"
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]"
          >
            {approvals ? (
              <ul>
                <li>
                  <MoreLink
                    item={approvals}
                    count={role === 'SUPER_ADMIN' && pendingApprovals > 0 ? pendingApprovals : null}
                    onNavigate={closeMore}
                  />
                </li>
              </ul>
            ) : null}
            {restGroups.map((group) => {
              const labelId = `${baseId}-${group.id}`
              return (
                <div key={group.id} className="mt-3 first:mt-0">
                  {group.label ? (
                    <p
                      id={labelId}
                      className="flex h-7 items-center whitespace-nowrap px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {group.label}
                    </p>
                  ) : null}
                  <ul aria-labelledby={group.label ? labelId : undefined}>
                    {group.items.map((item) => (
                      <li key={item.to}>
                        <MoreLink item={item} count={null} onNavigate={closeMore} />
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
