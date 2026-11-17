import path from 'node:path'

/**
 * Arnés visual sintético (RDS-F0-U5, D12): AppLayout y páginas reales, API y sesión de fixture,
 * Firebase sustituido por un stub, solo 127.0.0.1, sin .env (envDir: false) y sin red.
 */
export default async function browserConfig() {
  const [{ default: react }, { default: tailwindcss }] = await Promise.all([
    import('@vitejs/plugin-react'), import('@tailwindcss/vite'),
  ])
  const root = process.cwd()
  const harness = path.resolve(root, 'docs/evidence/admin-premium-redesign-f0-20261115/browser-harness')
  return {
    root: harness,
    publicDir: path.join(root, 'public'),
    envDir: false,
    cacheDir: path.join(harness, 'node_modules/.vite'),
    plugins: [react(), tailwindcss()],
    define: { __APP_VERSION__: JSON.stringify('rediseno-f0-synthetic') },
    resolve: { alias: [
      { find: '@/lib/api', replacement: path.join(harness, 'fixture-api.ts') },
      { find: '@/lib/firebase', replacement: path.join(harness, 'fixture-firebase.ts') },
      { find: '@/hooks/use-auth', replacement: path.join(harness, 'fixture-auth.ts') },
      { find: '@', replacement: path.join(root, 'src') },
    ] },
    server: { host: '127.0.0.1', port: 5192, strictPort: true, fs: { allow: [root] } },
  }
}
