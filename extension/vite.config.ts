import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// 浏览器扩展专用 Vite 配置
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src')
    }
  },
  root: resolve(__dirname),
  build: {
    target: 'es2015',
    outDir: resolve(__dirname, '../dist-extension'),
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html')
      },
      output: {
        // 确保文件名不带哈希，扩展需要固定文件名
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          ui: ['naive-ui'],
          utils: ['fuse.js', 'dayjs', '@vueuse/core']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // 禁用 CSS 代码分割，确保所有样式在一个文件中
    cssCodeSplit: false
  },
  base: './',
  server: {
    port: 3001
  }
})
