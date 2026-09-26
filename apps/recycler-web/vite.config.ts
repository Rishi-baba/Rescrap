import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number.parseInt(process.env['RECYCLER_WEB_PORT'] ?? '5175', 10);

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
