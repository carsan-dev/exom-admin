import path from 'node:path'

// CommonJS config boundary avoids Vite's ESM .vite-temp file write/unlink.
// Dynamic plugin imports preserve ESM-only plugins without reading dotenv.
export default async function isolatedConfig() {
  const [{ default: react }, { default: tailwindcss }] = await Promise.all([
    import('@vitejs/plugin-react'), import('@tailwindcss/vite'),
  ])
  return {
    envDir: false,
    plugins: [react(), tailwindcss()],
    define: { __APP_VERSION__: JSON.stringify('rest-t2e-isolated') },
    resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
    build: {
      outDir: path.resolve(process.cwd(), 'docs/evidence/rest-t2e-admin-20261005/build'),
      emptyOutDir: false,
      chunkSizeWarningLimit: 650,
    },
  }
}
