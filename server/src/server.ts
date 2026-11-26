import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { logger } from './utils/logger.js';

const app = createApp();

async function warmupDatabase(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info('Database connection verified');
      return;
    } catch (err) {
      logger.warn('Database warmup attempt failed', {
        attempt,
        error: err instanceof Error ? err.message : 'unknown'
      });
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }
}

const server = app.listen(env.PORT, () => {
  logger.info('Kestrel Care API listening', {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    aiProvider: env.AI_PROVIDER
  });
  void warmupDatabase();
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${env.PORT} is already in use. Stop the existing process on port ${env.PORT} before starting the server.`);
    process.exit(1);
  }
  throw err;
});

async function shutdown() {
  logger.info('Shutting down API server');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
