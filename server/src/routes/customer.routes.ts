import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { chatRateLimiter, refundRateLimiter } from '../middleware/rateLimit.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  createRefundSchema,
  createTicketSchema,
  paginationQuerySchema,
  postMessageSchema,
  uuidParamSchema
} from '../validators/schemas.js';
import {
  createRefundHandler,
  createTicketHandler,
  dashboardHandler,
  getOrderHandler,
  getRefundHandler,
  getTicketHandler,
  getTicketMessagesHandler,
  listOrdersHandler,
  listRefundsHandler,
  listTicketsHandler,
  postTicketMessageHandler
} from '../controllers/customer.controller.js';

export const customerRouter = Router();

customerRouter.use(requireAuth);

customerRouter.get('/dashboard', dashboardHandler);

customerRouter.get('/orders', validateQuery(paginationQuerySchema), listOrdersHandler);
customerRouter.get('/orders/:orderId', validateParams(uuidParamSchema('orderId')), getOrderHandler);

customerRouter.get('/tickets', validateQuery(paginationQuerySchema), listTicketsHandler);
customerRouter.post('/tickets', validateBody(createTicketSchema), createTicketHandler);
customerRouter.get(
  '/tickets/:ticketId',
  validateParams(uuidParamSchema('ticketId')),
  getTicketHandler
);
customerRouter.get(
  '/tickets/:ticketId/messages',
  validateParams(uuidParamSchema('ticketId')),
  getTicketMessagesHandler
);
customerRouter.post(
  '/tickets/:ticketId/messages',
  chatRateLimiter,
  validateParams(uuidParamSchema('ticketId')),
  validateBody(postMessageSchema),
  postTicketMessageHandler
);

customerRouter.get('/refunds', validateQuery(paginationQuerySchema), listRefundsHandler);
customerRouter.get(
  '/refunds/:refundId',
  validateParams(uuidParamSchema('refundId')),
  getRefundHandler
);
customerRouter.post(
  '/refunds',
  refundRateLimiter,
  validateBody(createRefundSchema),
  createRefundHandler
);
