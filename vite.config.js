import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          convex: ['convex', 'convex/react', 'convex/react-clerk'],
          clerk: ['@clerk/clerk-react'],
        },
      },
    },
  },
})
