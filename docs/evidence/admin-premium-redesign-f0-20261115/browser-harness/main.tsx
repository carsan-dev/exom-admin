import './boot'
import React from 'react'
import { createRoot } from 'react-dom/client'
import './fixture.css'
import App from '../../../../src/App'
import { initTheme } from '../../../../src/hooks/use-theme'

initTheme()
const root = document.getElementById('root')
if (!root) throw new Error('Fixture root missing')
createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
