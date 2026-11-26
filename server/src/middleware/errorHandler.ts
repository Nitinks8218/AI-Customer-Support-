import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { isAppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';

export function notFoundHandler(_req: Request, res: Response) {
  return sendError(res, 404, 'NOT_FOUND', 'The requested endpoint does not exist');
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (isAppError(err)) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P1001')
  ) {
    logger.error('Database connectivity error', {
      path: req.path,
      method: req.method,
      error: err.message
    });
    return sendError(
      res,
      503,
      'DATABASE_UNAVAILABLE',
      'Database is waking up or temporarily unreachable. Please retry in a few seconds.'
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return sendError(res, 409, 'CONFLICT', 'A record with that unique value already exists');
    }
    if (err.code === 'P2025') {
      return sendError(res, 404, 'NOT_FOUND', 'Requested record was not found');
    }
  }

  logger.error('Unhandled API error', {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? err.message : 'Unknown error'
  });

  return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected server error occurred');
}
