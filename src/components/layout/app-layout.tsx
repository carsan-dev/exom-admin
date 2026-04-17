import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const mainRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = mainRef.current
      const layoutScrollTop = scrollContainer?.scrollTop ?? 0
      const pageScrollTop = window.scrollY || document.documentElement.scrollTop || 0

      setShowScrollTop(Math.max(layoutScrollTop, pageScrollTop) > 360)
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
      <div className="flex min-h-screen min-h-[100svh] bg-background lg:h-screen lg:min-h-0 lg:overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex">
          <Sidebar isOpen={sidebarOpen} />
        </div>

        {/* Mobile sidebar — overlay */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            className="w-60 border-r border-border bg-background p-0 data-[state=closed]:duration-150 data-[state=open]:duration-200"
            aria-describedby={undefined}
          >
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <Sidebar isOpen={true} onClose={() => setMobileSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <div className="relative flex min-h-[100svh] flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
          <Header
            onMenuToggle={() => {
              if (window.innerWidth >= 1024) {
                setSidebarOpen((v) => !v)
              } else {
                setMobileSidebarOpen((v) => !v)
              }
            }}
          />
          <main
            ref={mainRef}
            className="flex-1 bg-background p-4 sm:p-6 lg:overflow-y-auto lg:overscroll-y-contain lg:[-webkit-overflow-scrolling:touch]"
          >
            <Outlet />
          </main>

          <div
            className={`pointer-events-none fixed bottom-4 right-4 z-40 flex transition-all duration-200 lg:absolute lg:bottom-6 lg:right-6 ${
              showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            <Button
              type="button"
              size="sm"
              onClick={handleScrollToTop}
              aria-label="Volver arriba"
              className="pointer-events-auto h-11 w-11 rounded-full px-0 shadow-lg shadow-black/15 sm:h-12 sm:w-auto sm:px-5"
            >
              <ArrowUp className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Volver arriba</span>
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
