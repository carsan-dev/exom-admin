import path from 'node:path'

export default async function browserConfig() {
  const [{ default: react }, { default: tailwindcss }] = await Promise.all([
    import('@vitejs/plugin-react'), import('@tailwindcss/vite'),
  ])
  const root = process.cwd()
  const evidence = path.resolve(root, 'docs/evidence/progress-dashboard-p6-20261011')
  return {
    root: path.join(evidence, 'browser'),
    publicDir: path.join(root, 'public'),
    envDir: false,
    cacheDir: path.join(evidence, 'node_modules/.vite'),
    plugins: [react(), tailwindcss()],
    define: { __APP_VERSION__: JSON.stringify('rest-t2e-browser-synthetic') },
    resolve: { alias: [
      { find: '@/lib/api', replacement: path.join(evidence, 'browser/fixture-api.ts') },
      { find: '@/hooks/use-auth', replacement: path.join(evidence, 'browser/fixture-auth.ts') },
      { find: '@', replacement: path.join(root, 'src') },
    ] },
    server: { host: '127.0.0.1', port: 5189, strictPort: true, fs: { allow: [root] } },
  }
}
