import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        game: path.resolve(__dirname, 'game.html'),
        gallery: path.resolve(__dirname, 'gallery.html'),
        demo: path.resolve(__dirname, 'dice-pool-demo.html'),
      },
    },
  },
  test: { environment: 'jsdom' }
})
