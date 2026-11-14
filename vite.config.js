import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createApi } from './server/api.js'
import { serveUpload } from './server/uploads.js'
import { contentSecurityPolicy } from './server/csp.js'

// Content-Security-Policy is injected only for production builds
// (Vite's dev server needs inline scripts for hot reload).
const cspPlugin = () => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml(html) {
    const csp = contentSecurityPolicy({ meta: true })
    return html.replace(
      '<!--CSP-->',
      `<meta http-equiv="Content-Security-Policy" content="${csp}" />`
    )
  },
})

// Mounts the JSON API (server/api.js) inside Vite, so `npm run dev` and `npm run preview`
// serve the website AND the API from one port with one command.
const apiPlugin = () => {
  const handler = createApi()
  // NB: must not return anything – Vite runs a returned function as a "post" hook.
  const mount = (server) => {
    server.middlewares.use((req, res, next) => (req.url.startsWith('/api/') ? handler(req, res) : serveUpload(req, res) ? undefined : next()))
  }
  return { name: 'kuntalamritam-api', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig({
  plugins: [react(), cspPlugin(), apiPlugin()],
  server: {
    watch: { ignored: ['**/server/data/**'] }, // data files change on every order
    // never let the dev server hand out secrets or the JSON database as static files
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/server/**'] },
  },
  esbuild: { drop: ['console', 'debugger'], legalComments: 'none' },
  build: {
    target: 'es2019', // every iPhone/Android from the last ~5 years; smaller output than legacy targets
    cssMinify: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        // React + router in their own long-cached file; app code stays small
        manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
})
