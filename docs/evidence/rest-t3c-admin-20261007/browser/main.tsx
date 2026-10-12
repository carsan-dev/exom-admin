import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '../../../../src/components/layout/app-layout'
import { UnsavedChangesGuard } from '../../../../src/components/layout/unsaved-changes-guard'
import { ClientDetailPage } from '../../../../src/features/clients/pages/client-detail-page'
import { ProgressPage } from '../../../../src/features/progress/pages/progress-page'
import { RecapDetailPage } from '../../../../src/features/recaps/pages/recap-detail-page'
import { RecapsPage } from '../../../../src/features/recaps/pages/recaps-page'
import { FIXTURE_IDS as ids } from '../../../../src/features/progress/follow-up-tasks/fixtures'
import { initTheme } from '../../../../src/hooks/use-theme'
import { fixtureCalls, fixtureControls, recapIds } from './fixture-api'
import { changeIdentity, fixtureGeneration, useAuth } from './fixture-auth'
import './fixture.css'

initTheme()
const router = createBrowserRouter([{ element: <><UnsavedChangesGuard /><AppLayout /></>, children: [
  { path: '/', element: <Navigate replace to={`/progress?clientId=${ids.client}&section=seguimiento`} /> },
  { path: '/progress', element: <ProgressPage /> },
  { path: '/clients/:id', element: <ClientDetailPage /> },
  { path: '/users/:id', element: <ClientDetailPage /> },
  { path: '/recaps', element: <RecapsPage /> },
  { path: '/recaps/:id', element: <RecapDetailPage /> },
  { path: '*', element: <p role="alert">Ruta fuera del harness autorizado.</p> },
] }])
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
Object.assign(window, { __recapFixture: {
  marker: 'REST-T3C-ISOLATED-20261007', ids, recapIds, calls: fixtureCalls, ...fixtureControls,
  changeIdentity, logout: () => useAuth.getState().logout(),
  authState: () => {
    const { user, isAuthenticated, isLoading } = useAuth.getState()
    return { userId: user?.id ?? null, role: user?.role ?? null, isAuthenticated, isLoading, generation: fixtureGeneration() }
  },
  navigate: (destination: string) => router.navigate(destination),
  refresh: () => queryClient.invalidateQueries({ queryKey: ['admin-recaps'] }),
} })
const root = document.getElementById('root')
if (!root) throw new Error('Missing isolated fixture root')
createRoot(root).render(<React.StrictMode><QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider></React.StrictMode>)
