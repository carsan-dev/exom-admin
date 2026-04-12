import { createBrowserRouter, RouterProvider, Navigate } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { AppLayout } from '@/components/layout/app-layout'
import { LoginPage } from '@/features/auth/pages/login-page'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { ClientsPage } from '@/features/clients/pages/clients-page'
import { ExercisesPage } from '@/features/exercises/pages/exercises-page'
import { TrainingsPage } from '@/features/trainings/pages/trainings-page'
import { IngredientsPage } from '@/features/ingredients/pages/ingredients-page'
import { DietsPage } from '@/features/diets/pages/diets-page'
import { AssignmentsPage } from '@/features/assignments/pages/assignments-page'
import { ProgressPage } from '@/features/progress/pages/progress-page'
import { FeedbackPage } from '@/features/feedback/pages/feedback-page'
import { RecapsPage } from '@/features/recaps/pages/recaps-page'
import { RecapDetailPage } from '@/features/recaps/pages/recap-detail-page'
import { ChallengesPage } from '@/features/challenges/pages/challenges-page'
import { AchievementsPage } from '@/features/achievements/pages/achievements-page'
import { NotificationsPage } from '@/features/notifications/pages/notifications-page'
import { ClientDetailPage } from '@/features/clients/pages/client-detail-page'
import { ApprovalRequestsPage } from '@/features/approval-requests/pages/approval-requests-page'
import { OnboardingPage } from '@/features/auth/pages/onboarding-page'
import { Toaster } from '@/components/ui/sonner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

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
        element: <OnboardingPage />,
      },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'clients', element: <ClientsPage /> },
          { path: 'clients/:id', element: <ClientDetailPage /> },
          { path: 'users', element: <ClientsPage /> },
          { path: 'users/:id', element: <ClientDetailPage /> },
          { path: 'exercises', element: <ExercisesPage /> },
          { path: 'trainings', element: <TrainingsPage /> },
          { path: 'ingredients', element: <IngredientsPage /> },
          { path: 'diets', element: <DietsPage /> },
          { path: 'assignments', element: <AssignmentsPage /> },
          { path: 'progress', element: <ProgressPage /> },
          { path: 'feedback', element: <FeedbackPage /> },
          { path: 'recaps', element: <RecapsPage /> },
          { path: 'recaps/:id', element: <RecapDetailPage /> },
          { path: 'challenges', element: <ChallengesPage /> },
          { path: 'achievements', element: <AchievementsPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'approval-requests', element: <ApprovalRequestsPage /> },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster closeButton richColors />
      <Analytics />
      <SpeedInsights />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
