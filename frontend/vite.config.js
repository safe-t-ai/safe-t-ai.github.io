import { defineConfig } from 'vite'
import { resolve } from 'path'

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
      input: {
        main: resolve(__dirname, 'index.html'),
        team: resolve(__dirname, 'team/index.html'),
      },
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/echarts')) return 'echarts';
        }
      }
    }
  }
})
