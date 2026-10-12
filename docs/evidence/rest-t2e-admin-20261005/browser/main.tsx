import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '../../../../src/components/layout/app-layout'
import { ProgressPage } from '../../../../src/features/progress/pages/progress-page'
import { FIXTURE_IDS } from '../../../../src/features/progress/follow-up-tasks/fixtures'
import { fixtureCalls, fixtureControls } from './fixture-api'
import { changeFixtureIdentity, useAuth } from './fixture-auth'
import './fixture.css'
import { initTheme } from '../../../../src/hooks/use-theme'

initTheme()
Object.assign(window, { __followupFixture: {
  calls: fixtureCalls,
  ...fixtureControls,
  changeIdentity: changeFixtureIdentity,
  logout: () => useAuth.getState().logout(),
} })

if (location.pathname !== '/progress') {
  location.replace(`/progress?clientId=${FIXTURE_IDS.client}&section=seguimiento`)
} else {
  const router = createBrowserRouter([{ element: <AppLayout />, children: [{ path: '/progress', element: <ProgressPage /> }] }])
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const root = document.getElementById('root')
  if (!root) throw new Error('Fixture root missing')
  createRoot(root).render(<React.StrictMode><QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider></React.StrictMode>)
}
