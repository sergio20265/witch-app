import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Capacitor loads from a file:// origin, so assets must be referenced relatively.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
