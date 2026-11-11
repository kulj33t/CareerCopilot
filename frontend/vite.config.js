import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxy = {
  '/api': {
    target: 'http://localhost:4000',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: apiProxy,
  },
  // Keep local production previews on the same /api proxy path too.
  preview: { proxy: apiProxy },
});
