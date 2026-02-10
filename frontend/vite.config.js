import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/echarts')) return 'echarts';
        }
      }
    }
  }
})
