import path from 'node:path'

export default async function browserConfig() {
  const [{ default: react }, { default: tailwindcss }] = await Promise.all([
    import('@vitejs/plugin-react'), import('@tailwindcss/vite'),
  ])
  const root = process.cwd()
  const evidence = path.resolve(root, 'docs/evidence/rest-t2e-admin-20261005')
  return {
    root: path.join(evidence, 'browser'),
    publicDir: path.join(root, 'public'),
    envDir: false,
    cacheDir: path.join(evidence, 'cache'),
    plugins: [react(), tailwindcss()],
    define: { __APP_VERSION__: JSON.stringify('rest-t2e-browser-synthetic') },
    resolve: { alias: [
      { find: '@/lib/api', replacement: path.join(evidence, 'browser/fixture-api.ts') },
      { find: '@/hooks/use-auth', replacement: path.join(evidence, 'browser/fixture-auth.ts') },
      { find: '@', replacement: path.join(root, 'src') },
    ] },
    server: { host: '127.0.0.1', port: 5187, strictPort: true, fs: { allow: [root] } },
  }
}
