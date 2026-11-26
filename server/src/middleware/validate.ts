import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../utils/errors.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload', {
          fields: result.error.flatten().fieldErrors
        })
      );
    }
    req.body = result.data;
    return next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid query parameters', {
          fields: result.error.flatten().fieldErrors
        })
      );
    }
    (req as Request & { validatedQuery?: T }).validatedQuery = result.data;
    return next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid route parameters', {
          fields: result.error.flatten().fieldErrors
        })
      );
    }
    req.params = result.data as unknown as Record<string, string>;
    return next();
  };
}
