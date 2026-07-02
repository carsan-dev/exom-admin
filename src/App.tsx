import { createBrowserRouter, RouterProvider, Navigate } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { AppLayout } from '@/components/layout/app-layout'
import { LoginPage } from '@/features/auth/pages/login-page'
import { Toaster } from '@/components/ui/sonner'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: 'onboarding',
        lazy: async () => ({ Component: (await import('@/features/auth/pages/onboarding-page')).OnboardingPage }),
      },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', lazy: async () => ({ Component: (await import('@/features/dashboard/pages/dashboard-page')).DashboardPage }) },
          { path: 'clients', lazy: async () => ({ Component: (await import('@/features/clients/pages/clients-page')).ClientsPage }) },
          { path: 'clients/:id', lazy: async () => ({ Component: (await import('@/features/clients/pages/client-detail-page')).ClientDetailPage }) },
          { path: 'users', lazy: async () => ({ Component: (await import('@/features/clients/pages/clients-page')).ClientsPage }) },
          { path: 'users/:id', lazy: async () => ({ Component: (await import('@/features/clients/pages/client-detail-page')).ClientDetailPage }) },
          { path: 'exercises', lazy: async () => ({ Component: (await import('@/features/exercises/pages/exercises-page')).ExercisesPage }) },
          { path: 'trainings', lazy: async () => ({ Component: (await import('@/features/trainings/pages/trainings-page')).TrainingsPage }) },
          { path: 'badges', lazy: async () => ({ Component: (await import('@/features/badges/pages/badges-page')).BadgesPage }) },
          { path: 'ingredients', lazy: async () => ({ Component: (await import('@/features/ingredients/pages/ingredients-page')).IngredientsPage }) },
          { path: 'diets', lazy: async () => ({ Component: (await import('@/features/diets/pages/diets-page')).DietsPage }) },
          { path: 'assignments', lazy: async () => ({ Component: (await import('@/features/assignments/pages/assignments-page')).AssignmentsPage }) },
          { path: 'progress', lazy: async () => ({ Component: (await import('@/features/progress/pages/progress-page')).ProgressPage }) },
          { path: 'feedback', lazy: async () => ({ Component: (await import('@/features/feedback/pages/feedback-page')).FeedbackPage }) },
          { path: 'recaps', lazy: async () => ({ Component: (await import('@/features/recaps/pages/recaps-page')).RecapsPage }) },
          { path: 'recaps/:id', lazy: async () => ({ Component: (await import('@/features/recaps/pages/recap-detail-page')).RecapDetailPage }) },
          { path: 'challenges', lazy: async () => ({ Component: (await import('@/features/challenges/pages/challenges-page')).ChallengesPage }) },
          { path: 'achievements', lazy: async () => ({ Component: (await import('@/features/achievements/pages/achievements-page')).AchievementsPage }) },
          { path: 'notifications', lazy: async () => ({ Component: (await import('@/features/notifications/pages/notifications-page')).NotificationsPage }) },
          { path: 'notification-templates', lazy: async () => ({ Component: (await import('@/features/notification-templates/pages/notification-templates-page')).NotificationTemplatesPage }) },
          { path: 'approval-requests', lazy: async () => ({ Component: (await import('@/features/approval-requests/pages/approval-requests-page')).ApprovalRequestsPage }) },
        ],
      },
    ],
  },
])

export default function App() {
  const isDevelopment = import.meta.env.DEV

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster closeButton richColors />
      {isDevelopment ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}
