import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 28310,
    strictPort: true,
  },
  preview: {
    port: 28310,
    strictPort: true,
  },
});

