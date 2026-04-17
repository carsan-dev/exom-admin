import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initTheme } from './hooks/use-theme'
import { useAuth } from './hooks/use-auth'

// Initialize theme before render to avoid flash
initTheme()

function Root() {
  const { initialize } = useAuth()

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <Root />
)
