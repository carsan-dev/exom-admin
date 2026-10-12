import './fixed-clock'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '../../../../src/components/layout/app-layout'
import { ProgressPage } from '../../../../src/features/progress/pages/progress-page'
import { AssignmentsPage } from '../../../../src/features/assignments/pages/assignments-page'
import { Toaster } from '../../../../src/components/ui/sonner'
import { fixtureCalls } from './fixture-api'
import './fixture.css'
import { initTheme } from '../../../../src/hooks/use-theme'

initTheme()
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
Object.assign(window, { __completionModeFixture: { calls: fixtureCalls } })
const router = createBrowserRouter([{ element: <AppLayout />, children: [
  { index: true, element: <Navigate to="/progress?clientId=11111111-1111-4111-8111-111111111111&section=resumen&date=2026-10-07" replace /> },
  { path: '/progress', element: <ProgressPage /> },
  { path: '/assignments', element: <AssignmentsPage /> },
  { path: '/recaps/:id', element: <p>Destino de recap · transporte sintético</p> },
] }])
const root = document.getElementById('root')
if (!root) throw new Error('Fixture root missing')
createRoot(root).render(<React.StrictMode><QueryClientProvider client={client}><RouterProvider router={router} /><Toaster closeButton richColors /></QueryClientProvider></React.StrictMode>)
