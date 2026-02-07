import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/durham-transport-safety-audit/' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})
