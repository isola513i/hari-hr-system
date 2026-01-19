import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk splitting
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'chart-vendor': ['recharts'],
            'ui-vendor': ['lucide-react'],
          },
        },
      },
      // Optimize chunk size
      chunkSizeWarningLimit: 600,
      // Enable minification with esbuild (faster than terser, built-in)
      minify: 'esbuild',
    },
  };
});
