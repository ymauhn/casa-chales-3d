import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// três páginas: a capa, os flats e a casa dos chalés; base relativa para abrir de qualquer pasta
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        flats: resolve(import.meta.dirname, 'flats.html'),
        casa: resolve(import.meta.dirname, 'casa.html'),
      },
    },
  },
  preview: { host: '127.0.0.1', port: 4173 },
});
