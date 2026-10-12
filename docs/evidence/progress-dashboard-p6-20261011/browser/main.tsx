import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '../../../../src/components/layout/app-layout'
import { ProgressPage } from '../../../../src/features/progress/pages/progress-page'
import { fixtureCalls, fixtureControls } from './fixture-api'
import { changeFixtureIdentity } from './fixture-auth'
import './fixture.css'
import { initTheme } from '../../../../src/hooks/use-theme'

initTheme()
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
Object.assign(window, { __dashboardFixture: { calls: fixtureCalls, ...fixtureControls,
  changeIdentity: changeFixtureIdentity, refresh: () => client.invalidateQueries(),
} })
const router = createBrowserRouter([{ element: <AppLayout />, children: [
  { path: '/progress', element: <ProgressPage /> },
  { path: '/recaps/:id', element: <p>Destino real de recap · transporte sintético</p> },
] }])
const root = document.getElementById('root')
if (!root) throw new Error('Fixture root missing')
createRoot(root).render(<React.StrictMode><QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider></React.StrictMode>)
