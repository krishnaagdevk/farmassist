import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor core — React + Router
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Charting library
          'vendor-recharts': ['recharts'],
          // Mapping library
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          // Icon library
          'vendor-lucide': ['lucide-react'],
          // HTTP client
          'vendor-axios': ['axios'],
        },
      },
    },
  },
});
