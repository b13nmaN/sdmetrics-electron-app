import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron({
      entry: 'public/main.js', // Electron main file
    }),
    renderer(), // Enables Node.js APIs in renderer
  ],
  server: {
    open: true,
    hmr: { overlay: false },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});