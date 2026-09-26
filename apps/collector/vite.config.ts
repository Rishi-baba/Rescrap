import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number.parseInt(process.env['COLLECTOR_PORT'] ?? '5176', 10);

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    strictPort: true,
  },
  preview: {
    port,
    strictPort: true,
  },
});
