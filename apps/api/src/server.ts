/**
 * Server entry point. Run with `pnpm --filter @rescrap/api dev` (watch) or
 * `pnpm --filter @rescrap/api start`.
 */
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp({ config });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`${signal} received, closing`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.host, port: config.port });
  app.log.info(`ReScrap API listening on http://localhost:${config.port}`);
  app.log.warn('DEMO MODE: recyclers, prices, payments and authorizations are fictional.');
}

main().catch((err: unknown) => {
  console.error('Failed to start ReScrap API:', err);
  process.exit(1);
});
