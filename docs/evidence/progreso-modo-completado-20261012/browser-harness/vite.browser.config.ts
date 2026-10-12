import path from 'node:path'

/** Synthetic visual harness: real AppLayout/ProgressPage/AssignmentsPage, fixture API and auth, 127.0.0.1 only. */
export default async function browserConfig() {
  const [{ default: react }, { default: tailwindcss }] = await Promise.all([
    import('@vitejs/plugin-react'), import('@tailwindcss/vite'),
  ])
  const root = process.cwd()
  const harness = path.resolve(root, 'docs/evidence/progreso-modo-completado-20261012/browser-harness')
  return {
    root: harness,
    publicDir: path.join(root, 'public'),
    envDir: false,
    cacheDir: path.join(harness, 'node_modules/.vite'),
    plugins: [react(), tailwindcss()],
    define: { __APP_VERSION__: JSON.stringify('modo-completado-visual-synthetic') },
    resolve: { alias: [
      { find: '@/lib/api', replacement: path.join(harness, 'fixture-api.ts') },
      { find: '@/hooks/use-auth', replacement: path.join(harness, 'fixture-auth.ts') },
      { find: '@', replacement: path.join(root, 'src') },
    ] },
    server: { host: '127.0.0.1', port: 5190, strictPort: true, fs: { allow: [root] } },
  }
}
