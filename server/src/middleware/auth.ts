import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  jti: string;
  exp?: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export const AUTH_COOKIE_NAME = 'kestrel_token';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  jti: string;
  exp?: number;
}

export function extractTokenFromRequest(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
  if (cookieToken && cookieToken.trim().length > 0) {
    return cookieToken.trim();
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.length > 0) {
      return token;
    }
  }
  return null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Session is invalid or expired');
    }

    if (!decoded.sub || !decoded.jti) {
      throw new AppError(401, 'INVALID_TOKEN', 'Malformed authentication token');
    }

    const revoked = await prisma.revokedToken.findUnique({ where: { jti: decoded.jti } });
    if (revoked) {
      throw new AppError(401, 'TOKEN_REVOKED', 'Session has been logged out');
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!dbUser) {
      throw new AppError(401, 'UNAUTHORIZED', 'Account no longer exists');
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      jti: decoded.jti,
      exp: decoded.exp
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication is required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
    }
    return next();
  };
}

export const requireStaff = requireRoles(UserRole.SUPPORT, UserRole.ADMIN);
export const requireAdmin = requireRoles(UserRole.ADMIN);
