import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env files from monorepo root for local development
  const env = loadEnv(mode, path.resolve(__dirname, '../../'), 'VITE_')

  // Merge with process.env - process.env takes precedence for CI/CD (Railway, etc.)
  const envWithProcessEnv = {
    VITE_API_URL: process.env.VITE_API_URL || env.VITE_API_URL || 'http://localhost:3000',
    VITE_EMAILJS_SERVICE_ID: process.env.VITE_EMAILJS_SERVICE_ID || env.VITE_EMAILJS_SERVICE_ID || '',
    VITE_EMAILJS_TEMPLATE_ID: process.env.VITE_EMAILJS_TEMPLATE_ID || env.VITE_EMAILJS_TEMPLATE_ID || '',
    VITE_EMAILJS_PUBLIC_KEY: process.env.VITE_EMAILJS_PUBLIC_KEY || env.VITE_EMAILJS_PUBLIC_KEY || '',
  }

  return {
    plugins: [react()],
    // Inject environment variables into the build
    // This ensures process.env vars from CI/CD are available as import.meta.env.*
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(envWithProcessEnv.VITE_API_URL),
      'import.meta.env.VITE_EMAILJS_SERVICE_ID': JSON.stringify(envWithProcessEnv.VITE_EMAILJS_SERVICE_ID),
      'import.meta.env.VITE_EMAILJS_TEMPLATE_ID': JSON.stringify(envWithProcessEnv.VITE_EMAILJS_TEMPLATE_ID),
      'import.meta.env.VITE_EMAILJS_PUBLIC_KEY': JSON.stringify(envWithProcessEnv.VITE_EMAILJS_PUBLIC_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            forms: ['react-hook-form', 'zod'],
          },
        },
      },
      sourcemap: true,
    },
    server: {
      port: 3003,
      strictPort: true,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 8080,
      host: '0.0.0.0',
      strictPort: true,
    },
  }
})
