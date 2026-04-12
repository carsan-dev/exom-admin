import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { Skeleton } from '@/components/ui/skeleton'

export function ProtectedRoute() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="text-2xl font-black tracking-widest text-brand-primary">EXOM</div>
        <div className="space-y-2 w-48">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-3/4" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect to onboarding if user has no profile yet
  if (user && !user.profile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
