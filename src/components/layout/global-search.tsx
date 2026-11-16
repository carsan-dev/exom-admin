import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { useNavigate } from 'react-router'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useCommandState } from 'cmdk'
import { ArrowRight, CircleAlert, RotateCw, Search } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useClients } from '@/features/clients/api'
import { getUserDisplayName, type Client } from '@/features/clients/types'
import { useDebouncedValue } from '@/features/base-service/use-debounced-value'
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { GlobalSearchContext, useGlobalSearch, type GlobalSearchContextValue } from './global-search-context'
import {
  CLIENT_SEARCH_DEBOUNCE_MS,
  CLIENT_SEARCH_LIMIT,
  CLIENT_SEARCH_MIN_LENGTH,
  filterEntries,
  findMatch,
  formatAnnouncement,
  getActionEntries,
  getClientDetailPath,
  getClientsListLabel,
  getClientsListPath,
  getNavigationEntries,
  type SearchEntry,
} from './global-search-model'

type Variant = 'desktop' | 'mobile'

type ClientsState =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; term: string; items: Client[] }

const CLIENTS_OFF: ClientsState = { status: 'off' }
const CLIENTS_LOADING: ClientsState = { status: 'loading' }

const KBD_CLASS =
  'inline-flex h-5 shrink-0 items-center border border-border-strong px-1.5 font-sans text-[11px] font-medium leading-none text-muted-foreground'

const GROUP_CLASS =
  'p-0 text-foreground [&+&]:mt-2 [&_[cmdk-group-heading]]:flex [&_[cmdk-group-heading]]:h-7 [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:whitespace-nowrap [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-0 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground'

function rowClass(variant: Variant) {
  return cn(
    'group/row cursor-pointer gap-3 rounded-none border-l-2 border-transparent py-0 pl-3.5 pr-4 text-sm text-foreground-secondary',
    "data-[selected='true']:border-accent-line data-[selected='true']:bg-lime-soft data-[selected=true]:text-foreground",
    '[&_svg]:text-muted-foreground data-[selected=true]:[&_svg]:text-accent-line',
    variant === 'mobile' ? 'min-h-12' : 'min-h-11',
  )
}

function isApplePlatform() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
}

function getFocusedElement() {
  const active = typeof document === 'undefined' ? null : document.activeElement
  return active instanceof HTMLElement ? active : null
}

/* ---------- Provider: state, Ctrl K / ⌘ K and the dialog ---------- */

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const isMdUp = useMediaQuery('(min-width: 768px)', true)

  const openSearch = useCallback((returnFocusTo?: HTMLElement | null) => {
    returnFocusRef.current = returnFocusTo ?? getFocusedElement()
    setOpen(true)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.repeat) return
      if (typeof event.key !== 'string' || event.key.toLowerCase() !== 'k') return

      if (open) {
        event.preventDefault()
        setOpen(false)
        return
      }

      // Not while the user is working inside another dialog.
      const target = event.target
      if (target instanceof Element && target.closest('[role="dialog"], [role="alertdialog"]')) return

      event.preventDefault()
      openSearch()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, openSearch])

  const value = useMemo<GlobalSearchContextValue>(() => ({ isOpen: open, openSearch }), [open, openSearch])
  const close = useCallback(() => setOpen(false), [])
  const variant: Variant = isMdUp ? 'desktop' : 'mobile'

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            data-global-search=""
            onCloseAutoFocus={(event) => {
              // Without a Radix Trigger focus would fall to <body>: return it to where it was.
              event.preventDefault()
              const target = returnFocusRef.current
              returnFocusRef.current = null
              if (target?.isConnected) target.focus()
            }}
            className={cn(
              'z-50 flex flex-col text-foreground anim-overlay-panel focus:outline-none',
              variant === 'desktop'
                ? 'fixed left-1/2 top-[15vh] w-[calc(100vw-2rem)] max-w-[640px] -translate-x-1/2 border border-border-strong bg-background-surface'
                : 'fixed inset-0 bg-background anim-overlay-from-bottom',
            )}
          >
            <DialogTitle className="sr-only">Buscador</DialogTitle>
            <SearchPalette variant={variant} onClose={close} />
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </GlobalSearchContext.Provider>
  )
}

/* ---------- Desktop header trigger ---------- */

export function GlobalSearchTrigger({ className }: { className?: string }) {
  const search = useGlobalSearch()
  if (!search) return null

  return (
    <button
      type="button"
      aria-label="Buscar"
      aria-haspopup="dialog"
      aria-expanded={search.isOpen}
      aria-keyshortcuts="Control+K Meta+K"
      onClick={(event) => search.openSearch(event.currentTarget)}
      className={cn(
        'h-8 w-[240px] shrink-0 items-center gap-2 border border-border-strong bg-transparent pl-2.5 pr-1.5 text-left text-[13px] text-muted-foreground',
        'transition-colors duration-(--dur-fast) ease-out hover:border-control-border-hover hover:bg-card hover:text-foreground-secondary',
        'aria-expanded:border-control-border aria-expanded:text-foreground-secondary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        className,
      )}
    >
      <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">Buscar…</span>
      <kbd aria-hidden="true" className={KBD_CLASS}>
        {isApplePlatform() ? '⌘ K' : 'Ctrl K'}
      </kbd>
    </button>
  )
}

/* ---------- Palette ---------- */

interface SearchPaletteProps {
  variant: Variant
  onClose: () => void
}

function SearchPalette({ variant, onClose }: SearchPaletteProps) {
  const navigate = useNavigate()
  const role = useAuth((state) => state.user?.role)
  const [query, setQuery] = useState('')
  const [reported, setReported] = useState<ReportedClients | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const trimmed = query.trim()
  const debounced = useDebouncedValue(trimmed, CLIENT_SEARCH_DEBOUNCE_MS)
  const clientsActive = trimmed.length >= CLIENT_SEARCH_MIN_LENGTH
  // Below the minimum, or until the first debounced term arrives, no request is made.
  const fetchTerm = clientsActive && debounced.length >= CLIENT_SEARCH_MIN_LENGTH ? debounced : null

  let clients: ClientsState = CLIENTS_OFF
  if (clientsActive) {
    // While the debounce is pending, or before the query reports the current term, show loading.
    clients =
      fetchTerm !== null && fetchTerm === trimmed && reported?.term === fetchTerm
        ? reported.state
        : CLIENTS_LOADING
  }

  const screens = useMemo(() => filterEntries(getNavigationEntries(role), trimmed), [role, trimmed])
  const actions = useMemo(() => filterEntries(getActionEntries(role), trimmed), [role, trimmed])
  const clientCount = clients.status === 'ready' ? clients.items.length : 0
  const announcement = formatAnnouncement(screens.length + actions.length + clientCount, clients.status)
  const isEmpty =
    screens.length === 0 &&
    actions.length === 0 &&
    clients.status !== 'loading' &&
    clients.status !== 'error' &&
    clientCount === 0

  const handleSelect = useCallback(
    (to: string) => {
      onClose()
      navigate(to)
    },
    [navigate, onClose],
  )

  const isDesktop = variant === 'desktop'

  return (
    <Command
      ref={rootRef}
      shouldFilter={false}
      loop
      vimBindings={false}
      label="Buscar"
      // Skeleton colors close to the panel/sheet background are invisible: use lighter tokens,
      // scoped to the search only (base border-strong, sweep control-border).
      className="h-auto min-h-0 flex-1 rounded-none bg-transparent text-foreground [--skeleton-base:var(--border-strong)] [--skeleton-hi:var(--control-border)]"
    >
      {isDesktop ? (
        <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border px-4 focus-within:shadow-[inset_0_-1px_0_var(--focus)] [&_[cmdk-input-wrapper]]:h-full [&_[cmdk-input-wrapper]]:min-w-0 [&_[cmdk-input-wrapper]]:flex-1 [&_[cmdk-input-wrapper]]:gap-3 [&_[cmdk-input-wrapper]]:border-0 [&_[cmdk-input-wrapper]]:px-0 [&_[cmdk-input-wrapper]_svg]:mr-0 [&_[cmdk-input-wrapper]_svg]:text-muted-foreground [&_[cmdk-input-wrapper]_svg]:opacity-100">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar pantallas, acciones o clientes…"
            className="h-full rounded-none py-0 text-[15px]"
          />
          <kbd aria-hidden="true" className={KBD_CLASS}>
            Esc
          </kbd>
        </div>
      ) : (
        // El input ocupa el alto del marco (44 px) incluido su borde de 1 px: el área pulsable llega a 44 sin cambiar el aspecto.
        <div className="flex shrink-0 items-center gap-1 border-b border-border pb-2 pl-3 pr-1 pt-[calc(env(safe-area-inset-top,0px)+8px)] [&_[cmdk-input-wrapper]]:h-11 [&_[cmdk-input-wrapper]]:min-w-0 [&_[cmdk-input-wrapper]]:flex-1 [&_[cmdk-input-wrapper]]:gap-2.5 [&_[cmdk-input-wrapper]]:border [&_[cmdk-input-wrapper]]:border-control-border [&_[cmdk-input-wrapper]]:bg-card [&_[cmdk-input-wrapper]:focus-within]:border-focus [&_[cmdk-input-wrapper]_svg]:mr-0 [&_[cmdk-input-wrapper]_svg]:text-muted-foreground [&_[cmdk-input-wrapper]_svg]:opacity-100">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar…"
            className="-my-px h-11 rounded-none py-0 text-base"
          />
          <button
            type="button"
            onClick={onClose}
            className="h-11 min-w-11 shrink-0 px-3 text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          >
            Cancelar
          </button>
        </div>
      )}

      <ActiveDescendantSync rootRef={rootRef} />
      {fetchTerm !== null ? <ClientsSearch term={fetchTerm} onChange={setReported} /> : null}

      <ResultsView
        query={trimmed}
        role={role}
        variant={variant}
        screens={screens}
        actions={actions}
        clients={clients}
        isEmpty={isEmpty}
        onSelect={handleSelect}
      />

      {isDesktop ? (
        <div className="flex h-9 shrink-0 items-center gap-4 border-t border-border px-4 text-xs text-muted-foreground">
          <span aria-hidden="true" className="inline-flex items-center gap-1.5">
            <kbd className={KBD_CLASS}>↑↓</kbd>navegar
          </span>
          <span aria-hidden="true" className="inline-flex items-center gap-1.5">
            <kbd className={KBD_CLASS}>↵</kbd>abrir
          </span>
          <span aria-hidden="true" className="inline-flex items-center gap-1.5">
            <kbd className={KBD_CLASS}>Esc</kbd>cerrar
          </span>
          <span role="status" aria-live="polite" className="ml-auto tabular-nums">
            {announcement}
          </span>
        </div>
      ) : (
        <span role="status" aria-live="polite" className="sr-only">
          {announcement}
        </span>
      )}
    </Command>
  )
}

/* ---------- aria-activedescendant ---------- */

// cmdk 1.1.1 computes `selectedItemId` before the newly selected row has rendered
// when the selection changes because rows mount or unmount (typing, results arriving),
// so the input's aria-activedescendant can be stale or missing until the next arrow key.
// After each selection change, point it at the row that is actually selected.
function ActiveDescendantSync({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const selection = useCommandState((state) => `${state.value}\u0000${state.selectedItemId ?? ''}`)

  useLayoutEffect(() => {
    const root = rootRef.current
    const input = root?.querySelector('[cmdk-input]')
    if (!root || !input) return
    const selectedId = root.querySelector('[cmdk-item][aria-selected="true"]')?.id
    if (selectedId) {
      input.setAttribute('aria-activedescendant', selectedId)
    } else {
      input.removeAttribute('aria-activedescendant')
    }
  }, [rootRef, selection])

  return null
}

/* ---------- Clients query ---------- */

interface ReportedClients {
  term: string
  state: ClientsState
}

// Renders nothing. It is mounted only when there is a term to search: `useClients`
// cannot be disabled, so mounting this component is what enables the request. It
// lives beside the results (not around them) so the result rows never remount.
function ClientsSearch({ term, onChange }: { term: string; onChange: (value: ReportedClients) => void }) {
  const { data, isError, isFetching, isPlaceholderData, refetch } = useClients({
    page: 1,
    limit: CLIENT_SEARCH_LIMIT,
    search: term,
    // Same default as the clients list, so «Ver todos» shows the same people.
    archive: 'visible',
  })

  const retry = useCallback(() => {
    void refetch()
  }, [refetch])

  const state = useMemo<ClientsState>(() => {
    if (isPlaceholderData) return CLIENTS_LOADING
    if (isError) return isFetching ? CLIENTS_LOADING : { status: 'error', retry }
    if (data) return { status: 'ready', term, items: data.data.slice(0, CLIENT_SEARCH_LIMIT) }
    return CLIENTS_LOADING
  }, [data, isError, isFetching, isPlaceholderData, retry, term])

  useEffect(() => {
    onChange({ term, state })
  }, [onChange, term, state])

  return null
}

/* ---------- Results ---------- */

interface ResultsViewProps {
  query: string
  role: string | undefined
  variant: Variant
  screens: SearchEntry[]
  actions: SearchEntry[]
  clients: ClientsState
  isEmpty: boolean
  onSelect: (to: string) => void
}

function ResultsView({ query, role, variant, screens, actions, clients, isEmpty, onSelect }: ResultsViewProps) {
  const row = rowClass(variant)

  return (
    <CommandList
      aria-label="Resultados"
      className={cn(
        'overscroll-y-contain py-2',
        variant === 'desktop'
          ? 'max-h-[min(420px,60svh)]'
          : 'max-h-none min-h-0 flex-1 pb-[calc(12px+env(safe-area-inset-bottom,0px))]',
      )}
    >
      {isEmpty ? (
        <div className="flex flex-col items-center px-6 pb-11 pt-10 text-center">
          <Search aria-hidden="true" className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Sin resultados para “{query}”</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Prueba con el nombre de una pantalla o de un cliente
          </p>
        </div>
      ) : null}

      {screens.length > 0 ? (
        <CommandGroup heading="Ir a" className={GROUP_CLASS}>
          {screens.map((entry) => (
            <EntryRow key={entry.id} entry={entry} query={query} variant={variant} className={row} onSelect={onSelect} />
          ))}
        </CommandGroup>
      ) : null}

      {actions.length > 0 ? (
        <CommandGroup heading="Acciones" className={GROUP_CLASS}>
          {actions.map((entry) => (
            <EntryRow key={entry.id} entry={entry} query={query} variant={variant} className={row} onSelect={onSelect} />
          ))}
        </CommandGroup>
      ) : null}

      {clients.status === 'loading' ? (
        <CommandGroup heading="Clientes" aria-busy="true" className={GROUP_CLASS}>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              aria-hidden="true"
              className={cn('flex items-center gap-3 px-4', variant === 'mobile' ? 'min-h-12' : 'min-h-11')}
            >
              <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className={cn('h-2.5', ['w-[46%]', 'w-[54%]', 'w-[62%]'][index])} />
                <Skeleton className={cn('h-2', ['w-[66%]', 'w-[60%]', 'w-[54%]'][index])} />
              </div>
            </div>
          ))}
        </CommandGroup>
      ) : null}

      {clients.status === 'error' ? (
        <CommandGroup heading="Clientes" className={GROUP_CLASS}>
          <CommandItem
            value="clients:retry"
            aria-label="Reintentar la búsqueda de clientes"
            onSelect={clients.retry}
            className={cn(row, 'pr-3')}
          >
            <CircleAlert aria-hidden="true" className="text-status-error!" />
            <span className="min-w-0 truncate">
              No se pudieron buscar clientes
            </span>
            <span
              aria-hidden="true"
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'pointer-events-none ml-auto h-8 px-2.5 text-[13px]')}
            >
              <RotateCw />
              Reintentar
            </span>
          </CommandItem>
        </CommandGroup>
      ) : null}

      {clients.status === 'ready' && clients.items.length > 0 ? (
        <CommandGroup heading="Clientes" className={GROUP_CLASS}>
          {clients.items.map((client) => (
            <ClientRow
              key={client.id}
              client={client}
              query={query}
              className={row}
              onSelect={() => onSelect(getClientDetailPath(client.id, role))}
            />
          ))}
          <CommandItem
            value="clients:all"
            onSelect={() => onSelect(getClientsListPath(clients.term, role))}
            className={row}
          >
            <ArrowRight aria-hidden="true" />
            <span className="min-w-0 truncate">{getClientsListLabel(role)}</span>
          </CommandItem>
        </CommandGroup>
      ) : null}
    </CommandList>
  )
}

interface EntryRowProps {
  entry: SearchEntry
  query: string
  variant: Variant
  className: string
  onSelect: (to: string) => void
}

function EntryRow({ entry, query, variant, className, onSelect }: EntryRowProps) {
  const { icon: Icon } = entry
  return (
    <CommandItem value={entry.id} onSelect={() => onSelect(entry.to)} className={className}>
      <Icon aria-hidden="true" />
      <span className="min-w-0 truncate">
        <Highlight text={entry.label} query={query} />
      </span>
      {entry.hintIsRoute && variant === 'mobile' ? null : (
        <span
          className={cn(
            'ml-auto shrink-0 pl-3 text-xs text-muted-foreground',
            variant === 'mobile' && 'max-w-[45%] truncate',
          )}
        >
          {entry.hint}
        </span>
      )}
    </CommandItem>
  )
}

interface ClientRowProps {
  client: Client
  query: string
  className: string
  onSelect: () => void
}

function ClientRow({ client, query, className, onSelect }: ClientRowProps) {
  const name = getUserDisplayName(client)
  const initials =
    `${client.profile?.first_name?.[0] ?? ''}${client.profile?.last_name?.[0] ?? ''}`.toUpperCase() ||
    client.email.slice(0, 1).toUpperCase()

  return (
    <CommandItem value={`client:${client.id}`} onSelect={onSelect} className={className}>
      <Avatar aria-hidden="true" className="h-7 w-7">
        <AvatarImage src={client.profile?.avatar_url ?? undefined} alt="" />
        <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-col py-1 leading-[18px]">
        <span className="truncate text-foreground">
          <Highlight text={name} query={query} />
        </span>
        <span className="truncate text-xs text-muted-foreground">
          <Highlight text={client.email} query={query} />
        </span>
      </span>
    </CommandItem>
  )
}

function Highlight({ text, query }: { text: string; query: string }) {
  const match = findMatch(text, query)
  if (!match) return <>{text}</>
  const [start, end] = match
  return (
    <>
      {text.slice(0, start)}
      <b className="font-bold text-foreground">{text.slice(start, end)}</b>
      {text.slice(end)}
    </>
  )
}
