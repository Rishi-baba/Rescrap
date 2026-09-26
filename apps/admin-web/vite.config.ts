import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The admin console runs on 5174 by default.
 *
 * 5173 is Vite's usual first choice, but it is already taken on this machine
 * by an unrelated app, and `strictPort` then kills the whole `pnpm dev` run
 * including the API. Override with ADMIN_WEB_PORT if 5174 is busy.
 */
const port = Number.parseInt(process.env['ADMIN_WEB_PORT'] ?? '5174', 10);

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
