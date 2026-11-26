import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response.js';
import * as staffService from '../services/staff.service.js';
import type { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export async function staffDashboardHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await staffService.getStaffDashboard();
    return sendSuccess(res, data);
  } catch (err) {
    return next(err);
  }
}

export async function listStaffTicketsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (
      req as Request & {
        validatedQuery: {
          page: number;
          limit: number;
          status?: TicketStatus;
          priority?: TicketPriority;
          category?: TicketCategory;
          assignedTo?: string;
          query?: string;
        };
      }
    ).validatedQuery;
    const result = await staffService.listStaffTickets(q);
    return sendSuccess(
      res,
      { tickets: result.items, staffAgents: result.staffAgents },
      200,
      result.meta
    );
  } catch (err) {
    return next(err);
  }
}

export async function getStaffTicketHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const detail = await staffService.getStaffTicketDetail(String(req.params.ticketId));
    return sendSuccess(res, detail);
  } catch (err) {
    return next(err);
  }
}

export async function updateStaffTicketHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const updated = await staffService.updateStaffTicket(
      String(req.params.ticketId),
      req.user!.id,
      req.body
    );
    return sendSuccess(res, updated);
  } catch (err) {
    return next(err);
  }
}

export async function addInternalNoteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const note = await staffService.addStaffInternalNote(
      String(req.params.ticketId),
      req.user!.id,
      req.body.content
    );
    return sendSuccess(res, note, 201);
  } catch (err) {
    return next(err);
  }
}

export async function listStaffRefundsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (
      req as Request & { validatedQuery: { page: number; limit: number; status?: string } }
    ).validatedQuery;
    const result = await staffService.listStaffRefunds(q.page, q.limit, q.status);
    return sendSuccess(res, result.items, 200, result.meta);
  } catch (err) {
    return next(err);
  }
}

export async function getStaffRefundHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const detail = await staffService.getStaffRefundDetail(String(req.params.refundId));
    return sendSuccess(res, detail);
  } catch (err) {
    return next(err);
  }
}

export async function decideRefundHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const updated = await staffService.decideRefund(String(req.params.refundId), req.user!.id, req.body);
    return sendSuccess(res, updated);
  } catch (err) {
    return next(err);
  }
}

export async function listStaffEscalationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (
      req as Request & { validatedQuery: { page: number; limit: number; decision?: string } }
    ).validatedQuery;
    const result = await staffService.listStaffEscalations(q.page, q.limit, q.decision);
    return sendSuccess(res, result.items, 200, result.meta);
  } catch (err) {
    return next(err);
  }
}

export async function getStaffEscalationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const detail = await staffService.getStaffEscalationDetail(String(req.params.escalationId));
    return sendSuccess(res, detail);
  } catch (err) {
    return next(err);
  }
}

export async function decideEscalationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await staffService.decideEscalation(
      String(req.params.escalationId),
      req.user!.id,
      req.body
    );
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function listAdminUsersHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await staffService.listUsersForAdmin();
    return sendSuccess(res, users);
  } catch (err) {
    return next(err);
  }
}

export async function updateAdminUserRoleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await staffService.updateUserRoleByAdmin(
      String(req.params.userId),
      req.user!.id,
      req.body.role
    );
    return sendSuccess(res, user);
  } catch (err) {
    return next(err);
  }
}
