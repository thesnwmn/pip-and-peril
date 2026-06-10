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
      },
    },
  },
  test: { environment: 'jsdom' }
})
