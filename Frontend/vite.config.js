import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  "main": "./dist/package-name.umd.cjs",
  "exports": {
  ".": {
    "import": "./dist/package-name.js",
    "require": "./dist/package-name.umd.cjs"
  }
},
  server:{port:3000}
})
