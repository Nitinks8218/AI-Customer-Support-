import type { Request, Response, NextFunction } from 'express';
import { AUTH_COOKIE_NAME } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { sendSuccess } from '../utils/response.js';
import * as authService from '../services/auth.service.js';

function setAuthCookie(req: Request, res: Response, token: string) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production' && isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.registerCustomer(req.body);
    setAuthCookie(req, res, result.token);
    return sendSuccess(res, result, 201);
  } catch (err) {
    return next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.loginUser(req.body);
    setAuthCookie(req, res, result.token);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user) {
      await authService.logoutToken(req.user.jti, req.user.exp);
    }
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    return sendSuccess(res, { loggedOut: true });
  } catch (err) {
    return next(err);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await authService.getUserProfile(req.user!.id);
    return sendSuccess(res, { user: profile });
  } catch (err) {
    return next(err);
  }
}
