import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeStore {
  theme: Theme
  toggle: () => void
  setTheme: (theme: Theme) => void
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(theme)
  localStorage.setItem('exom-admin-theme', theme)
}

export const useTheme = create<ThemeStore>()((set) => ({
  theme: 'dark',

  toggle: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return { theme: next }
    }),

  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
}))

// Call once at app startup to restore persisted theme
export function initTheme() {
  const saved = localStorage.getItem('exom-admin-theme') as Theme | null
  const theme: Theme = saved === 'light' ? 'light' : 'dark'
  applyTheme(theme)
  useTheme.setState({ theme })
}
