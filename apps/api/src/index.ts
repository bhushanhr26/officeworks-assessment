import { loadConfig, loadDotEnv } from './config';
import { loadFeaturedProductIds } from './featured-config';
import { buildApp, registerGracefulShutdown } from './server';

function main(): void {
  loadDotEnv();
  const config = loadConfig();
  const featuredProductIds = loadFeaturedProductIds(config.FEATURED_CONFIG_PATH);
  const logger = console;

  const app = buildApp(config, featuredProductIds, logger);
  const server = app.listen(config.PORT, () => {
    logger.info(`API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
  });
  registerGracefulShutdown(server, { logger });
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
