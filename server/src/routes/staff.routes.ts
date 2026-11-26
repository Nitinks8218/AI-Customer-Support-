import { Router } from 'express';
import { requireAdmin, requireAuth, requireStaff } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  createInternalNoteSchema,
  reviewDecisionSchema,
  staffEscalationFilterSchema,
  staffRefundFilterSchema,
  staffTicketFilterSchema,
  updateStaffTicketSchema,
  updateUserRoleSchema,
  uuidParamSchema
} from '../validators/schemas.js';
import {
  addInternalNoteHandler,
  decideEscalationHandler,
  decideRefundHandler,
  getStaffEscalationHandler,
  getStaffRefundHandler,
  getStaffTicketHandler,
  listAdminUsersHandler,
  listStaffEscalationsHandler,
  listStaffRefundsHandler,
  listStaffTicketsHandler,
  staffDashboardHandler,
  updateAdminUserRoleHandler,
  updateStaffTicketHandler
} from '../controllers/staff.controller.js';

export const staffRouter = Router();

staffRouter.use(requireAuth, requireStaff);

staffRouter.get('/dashboard', staffDashboardHandler);

staffRouter.get('/tickets', validateQuery(staffTicketFilterSchema), listStaffTicketsHandler);
staffRouter.get(
  '/tickets/:ticketId',
  validateParams(uuidParamSchema('ticketId')),
  getStaffTicketHandler
);
staffRouter.patch(
  '/tickets/:ticketId',
  validateParams(uuidParamSchema('ticketId')),
  validateBody(updateStaffTicketSchema),
  updateStaffTicketHandler
);
staffRouter.post(
  '/tickets/:ticketId/notes',
  validateParams(uuidParamSchema('ticketId')),
  validateBody(createInternalNoteSchema),
  addInternalNoteHandler
);

staffRouter.get('/refunds', validateQuery(staffRefundFilterSchema), listStaffRefundsHandler);
staffRouter.get(
  '/refunds/:refundId',
  validateParams(uuidParamSchema('refundId')),
  getStaffRefundHandler
);
staffRouter.post(
  '/refunds/:refundId/decision',
  validateParams(uuidParamSchema('refundId')),
  validateBody(reviewDecisionSchema),
  decideRefundHandler
);

staffRouter.get(
  '/escalations',
  validateQuery(staffEscalationFilterSchema),
  listStaffEscalationsHandler
);
staffRouter.get(
  '/escalations/:escalationId',
  validateParams(uuidParamSchema('escalationId')),
  getStaffEscalationHandler
);
staffRouter.post(
  '/escalations/:escalationId/decision',
  validateParams(uuidParamSchema('escalationId')),
  validateBody(reviewDecisionSchema),
  decideEscalationHandler
);

staffRouter.get('/users', requireAdmin, listAdminUsersHandler);
staffRouter.patch(
  '/users/:userId',
  requireAdmin,
  validateParams(uuidParamSchema('userId')),
  validateBody(updateUserRoleSchema),
  updateAdminUserRoleHandler
);
