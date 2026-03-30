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
    const scrollContainer = mainRef.current

    if (!scrollContainer) {
      return
    }

    const handleScroll = () => {
      setShowScrollTop(scrollContainer.scrollTop > 360)
    }

    handleScroll()
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleScrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex">
          <Sidebar isOpen={sidebarOpen} />
        </div>

        {/* Mobile sidebar — overlay */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="p-0 w-60" aria-describedby={undefined}>
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <Sidebar isOpen={true} onClose={() => setMobileSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <div className="relative flex flex-col flex-1 overflow-hidden">
          <Header
            onMenuToggle={() => {
              if (window.innerWidth >= 1024) {
                setSidebarOpen((v) => !v)
              } else {
                setMobileSidebarOpen((v) => !v)
              }
            }}
          />
          <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Outlet />
          </main>

          <div
            className={`pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-all duration-200 sm:inset-x-auto sm:right-6 sm:justify-end ${
              showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
          >
            <Button
              type="button"
              size="sm"
              onClick={handleScrollToTop}
              className="pointer-events-auto h-11 rounded-full px-4 shadow-lg shadow-black/15 sm:h-12 sm:px-5"
            >
              <ArrowUp className="h-4 w-4" />
              Volver arriba
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
