import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';
import {
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler
} from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, validateBody(registerSchema), registerHandler);
authRouter.post('/login', authRateLimiter, validateBody(loginSchema), loginHandler);
authRouter.post('/logout', requireAuth, logoutHandler);
authRouter.get('/me', requireAuth, meHandler);
