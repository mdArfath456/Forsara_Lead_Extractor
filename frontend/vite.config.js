import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Keeps the frontend talking to '/api/...' in dev without CORS friction;
      // production deploy points this at the real backend origin instead.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        credentials: true,
      },
    },
  },
});
