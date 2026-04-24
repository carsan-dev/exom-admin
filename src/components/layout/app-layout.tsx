import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
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
      <div className="flex min-h-screen min-h-[100svh] overflow-x-hidden bg-background lg:h-screen lg:min-h-0 lg:overflow-hidden">
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
        <div className="relative flex min-h-[100svh] min-w-0 flex-1 flex-col overflow-x-hidden lg:min-h-0 lg:overflow-hidden">
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
            className={cn(
              'min-w-0 flex-1 bg-background p-4 sm:p-6 lg:overflow-y-auto lg:overscroll-y-contain lg:[-webkit-overflow-scrolling:touch]',
              showScrollTop ? 'pb-24 sm:pb-28' : null,
            )}
          >
            <Outlet />
          </main>

          {showScrollTop ? (
            <div className="fixed bottom-4 right-4 z-50 flex sm:bottom-6 sm:right-6">
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
    </TooltipProvider>
  )
}
