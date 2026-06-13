import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  plugins: [
    {
      name: 'gzip-serve',
      apply: 'serve',
      configureServer(server) {
        const publicDir = join(process.cwd(), 'public')
        server.middlewares.use((req, res, next) => {
          if (req.method !== 'GET') return next()
          const gzPath = join(publicDir, req.url + '.gz')
          if (!existsSync(gzPath)) return next()
          res.setHeader('Content-Encoding', 'gzip')
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Vary', 'Accept-Encoding')
          res.end(readFileSync(gzPath))
        })
      },
    },
    react(),
    tailwindcss(),
  ],
})
