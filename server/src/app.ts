import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { openApiSpec } from './config/swagger.js';
import { authRouter } from './routes/auth.routes.js';
import { customerRouter } from './routes/customer.routes.js';
import { staffRouter } from './routes/staff.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { sendError, sendSuccess } from './utils/response.js';
import { ALLOWED_TOOL_NAMES } from './agent/tools/agent.tools.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // OpenAPI / Swagger UI
  app.get('/api/docs.json', (_req, res) => res.json(openApiSpec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // Health & AI Status
  app.get('/api/v1/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return sendSuccess(res, {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch {
      return sendError(res, 503, 'DATABASE_UNAVAILABLE', 'Database connectivity check failed');
    }
  });

  app.get('/api/v1/agent/status', (_req, res) => {
    const geminiConfigured = env.AI_PROVIDER === 'gemini' && Boolean(env.AI_API_KEY);
    return sendSuccess(res, {
      provider: geminiConfigured ? 'gemini' : 'mock',
      model: geminiConfigured ? env.AI_MODEL : 'deterministic-policy-agent-v1',
      allowlistedTools: ALLOWED_TOOL_NAMES,
      refundAutoLimitINR: '5000.00',
      returnWindowDays: 14,
      simulatedRefundsOnly: true
    });
  });

  // Feature Routers
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/staff', staffRouter);
  app.use('/api/v1', customerRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
