import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (
            id.includes('/react/')
            || id.includes('react-dom')
            || id.includes('react-router')
            || id.includes('/history/')
            || id.includes('/scheduler/')
          ) {
            return 'react-core'
          }

          if (id.includes('react-query')) return 'data-layer'
          if (id.includes('axios')) return 'network'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('react-hot-toast')) return 'toast'

          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
