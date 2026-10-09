import path from 'node:path'

export default async function browserConfig() {
  const [{ default: react }, { default: tailwindcss }] = await Promise.all([
    import('@vitejs/plugin-react'), import('@tailwindcss/vite'),
  ])
  const root = process.cwd()
  const evidence = path.resolve(root, 'docs/evidence/rest-t3c-admin-20261007')
  return {
    root: path.join(evidence, 'browser'), publicDir: path.join(root, 'public'),
    envDir: false, cacheDir: path.join(evidence, 'browser/cache'),
    plugins: [
      { name: 'rest-t3c-forbid-real-auth', enforce: 'pre' as const,
        resolveId(id: string) {
          if (id === '@/lib/firebase' || /^(?:@firebase\/|firebase(?:\/|$))/.test(id)) throw new Error('Real Firebase is forbidden in this isolated harness')
          return null
        },
        load(id: string) {
          if (/\/src\/(?:lib\/(?:firebase|api)|hooks\/use-auth)\.ts(?:\?|$)/.test(id.replace(/\\/g, '/'))) throw new Error('Shipping auth/transport must resolve to fixture aliases')
          return null
        },
      }, react(), tailwindcss(),
    ],
    define: { __APP_VERSION__: JSON.stringify('rest-t3c-browser-synthetic') },
    resolve: { alias: [
      { find: '@/lib/api', replacement: path.join(evidence, 'browser/fixture-api.ts') },
      { find: '@/hooks/use-auth', replacement: path.join(evidence, 'browser/fixture-auth.ts') },
      { find: '@', replacement: path.join(root, 'src') },
    ] },
    server: { host: '127.0.0.1', port: 5188, strictPort: true, fs: { allow: [root] } },
    build: { outDir: path.join(evidence, 'browser/build'), emptyOutDir: false },
  }
}
