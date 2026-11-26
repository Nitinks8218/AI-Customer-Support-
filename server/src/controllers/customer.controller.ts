import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response.js';
import * as orderService from '../services/order.service.js';
import * as ticketService from '../services/ticket.service.js';
import * as refundService from '../services/refund.service.js';
import { handleCustomerTicketMessage } from '../agent/agent.service.js';

export async function dashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await ticketService.getCustomerDashboard(req.user!.id);
    return sendSuccess(res, data);
  } catch (err) {
    return next(err);
  }
}

export async function listOrdersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = (req as Request & { validatedQuery: { page: number; limit: number } }).validatedQuery;
    const result = await orderService.listCustomerOrders(req.user!.id, page, limit);
    return sendSuccess(res, result.items, 200, result.meta);
  } catch (err) {
    return next(err);
  }
}

export async function getOrderHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await orderService.getCustomerOrderById(req.user!.id, String(req.params.orderId));
    return sendSuccess(res, order);
  } catch (err) {
    return next(err);
  }
}

export async function listTicketsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = (req as Request & { validatedQuery: { page: number; limit: number } }).validatedQuery;
    const result = await ticketService.listCustomerTickets(req.user!.id, page, limit);
    return sendSuccess(res, result.items, 200, result.meta);
  } catch (err) {
    return next(err);
  }
}

export async function createTicketHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const ticket = await ticketService.createCustomerTicket({
      customerId: req.user!.id,
      ...req.body
    });
    return sendSuccess(res, ticket, 201);
  } catch (err) {
    return next(err);
  }
}

export async function getTicketHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const detail = await ticketService.getCustomerTicketDetail(req.user!.id, String(req.params.ticketId));
    return sendSuccess(res, detail);
  } catch (err) {
    return next(err);
  }
}

export async function getTicketMessagesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const messages = await ticketService.getCustomerTicketMessages(req.user!.id, String(req.params.ticketId));
    return sendSuccess(res, messages);
  } catch (err) {
    return next(err);
  }
}

export async function postTicketMessageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await handleCustomerTicketMessage({
      ticketId: String(req.params.ticketId),
      customerId: req.user!.id,
      content: req.body.content
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    return next(err);
  }
}

export async function listRefundsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = (req as Request & { validatedQuery: { page: number; limit: number } }).validatedQuery;
    const result = await refundService.listCustomerRefunds(req.user!.id, page, limit);
    return sendSuccess(res, result.items, 200, result.meta);
  } catch (err) {
    return next(err);
  }
}

export async function getRefundHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const refund = await refundService.getCustomerRefundById(req.user!.id, String(req.params.refundId));
    return sendSuccess(res, refund);
  } catch (err) {
    return next(err);
  }
}

export async function createRefundHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await refundService.requestCustomerRefund({
      customerId: req.user!.id,
      ...req.body
    });
    return sendSuccess(res, result, result.idempotentReplay ? 200 : 201);
  } catch (err) {
    return next(err);
  }
}
