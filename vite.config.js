import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  // O GitHub Pages usa um subdiretório; o app Capacitor precisa de arquivos
  // relativos dentro do pacote Android.
  base: mode === 'android' ? './' : '/anime-calendar-V3/',
  plugins: [react()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    proxy: {
      '/api-proxy': {
        target: 'https://animeschedule.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ''),
      },
    },
  },
}))
