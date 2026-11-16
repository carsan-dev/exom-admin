import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useAuth } from '@/hooks/use-auth'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { MobileTabbar } from './mobile-tabbar'
import { usePendingCounts } from './use-pending-counts'
import { readSidebarExpanded, writeSidebarExpanded } from './sidebar-state'
import { GlobalSearchProvider } from './global-search'
import { resolveRouteTitle, useDocumentTitle } from './use-document-title'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarExpanded)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)', true)
  const pendingCounts = usePendingCounts()
  const mainRef = useRef<HTMLElement | null>(null)
  const { pathname } = useLocation()
  const role = useAuth((state) => state.user?.role)
  useDocumentTitle(resolveRouteTitle(pathname, role))

  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = mainRef.current
      const layoutScrollTop = scrollContainer?.scrollTop ?? 0
      const pageScrollTop = window.scrollY || document.documentElement.scrollTop || 0

      setShowScrollTop(Math.max(layoutScrollTop, pageScrollTop) > 180)
    }

    handleScroll()
    const scrollContainer = mainRef.current

    scrollContainer?.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      scrollContainer?.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  const handleScrollToTop = () => {
    if ((mainRef.current?.scrollTop ?? 0) > 0) {
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <TooltipProvider>
      <GlobalSearchProvider>
        <div className="flex min-h-screen min-h-[100svh] overflow-x-clip bg-background lg:h-screen lg:min-h-0 lg:overflow-hidden">
          {/* Mismo patrón y texto que el inicio de sesión; se gestiona el foco sin cambiar la URL. */}
          <a
            href="#contenido"
            onClick={(event) => {
              event.preventDefault()
              mainRef.current?.focus()
            }}
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:outline-2 focus:outline-focus"
          >
            Saltar al contenido
          </a>

          {/* Sidebar: carril fijo en tablet (768-1023), preferencia guardada en escritorio */}
          <div className="hidden md:sticky md:top-0 md:flex md:h-svh md:self-start lg:static lg:h-auto lg:self-stretch">
            <Sidebar isOpen={isDesktop && sidebarOpen} pendingCounts={pendingCounts} />
          </div>

          {/* Barra inferior móvil (< md) */}
          <MobileTabbar pendingCounts={pendingCounts} />

          {/* Main content */}
          <div className="relative flex min-h-[100svh] min-w-0 flex-1 flex-col overflow-x-clip lg:min-h-0 lg:overflow-hidden">
            <Header
              onMenuToggle={() => {
                if (!isDesktop) return
                const next = !sidebarOpen
                setSidebarOpen(next)
                writeSidebarExpanded(next)
              }}
            />
            <main
              ref={mainRef}
              id="contenido"
              tabIndex={-1}
              className={cn(
                // scroll-pb: en lg el foco se desplaza dentro de main; reserva «Volver arriba» y el aviso de versión.
                'outline-none lg:scroll-pb-24 lg:[body:has([data-version-banner])_&]:scroll-pb-40',
                'min-w-0 max-w-full flex-1 bg-background p-3 pb-[calc(56px+env(safe-area-inset-bottom,0px)+16px)] sm:p-5 sm:pb-[calc(56px+env(safe-area-inset-bottom,0px)+16px)] md:pb-5 lg:overflow-y-auto lg:p-6 lg:overscroll-y-contain lg:[-webkit-overflow-scrolling:touch]',
                showScrollTop
                  ? 'pb-[calc(56px+env(safe-area-inset-bottom,0px)+76px)] sm:pb-[calc(56px+env(safe-area-inset-bottom,0px)+76px)] md:pb-28'
                  : null,
              )}
            >
              <Outlet />
            </main>

            {showScrollTop ? (
              // Por encima de la barra inferior móvil y, si está, del aviso de versión.
              <div data-scroll-top-button="" className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px)+16px)] right-4 z-50 flex sm:right-6 md:bottom-6 [body:has([data-version-banner])_&]:bottom-[calc(56px+env(safe-area-inset-bottom,0px)+132px)] md:[body:has([data-version-banner])_&]:bottom-24">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      onClick={handleScrollToTop}
                      aria-label="Volver arriba"
                      className="h-11 w-11 rounded-full border border-black/10 bg-primary text-primary-foreground shadow-xl shadow-black/25 sm:h-12 sm:w-12"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Volver arriba</TooltipContent>
                </Tooltip>
              </div>
            ) : null}
          </div>
        </div>
      </GlobalSearchProvider>
    </TooltipProvider>
  )
}
