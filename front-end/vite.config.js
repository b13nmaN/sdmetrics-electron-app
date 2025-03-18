import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    open: true, // Optional: Opens the browser automatically
    // Disable server overlay if it interferes
    hmr: { overlay: false },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    css: {
      postcss: './postcss.config.js', // Points to your PostCSS config
    },
  },
})
