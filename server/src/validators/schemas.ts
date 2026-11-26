import { z } from 'zod';
import { TicketCategory, TicketPriority, TicketStatus, UserRole } from '@prisma/client';

export const uuidParamSchema = (paramName: string) =>
  z.object({
    [paramName]: z.string().uuid(`Invalid ${paramName}`)
  });

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Valid email is required').max(120),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

export const createTicketSchema = z.object({
  category: z.nativeEnum(TicketCategory),
  subject: z.string().trim().min(4, 'Subject must be at least 4 characters').max(160),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(3000),
  orderId: z.string().uuid('Invalid orderId').optional().nullable()
});

export const postMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(3000)
});

export const createRefundSchema = z.object({
  orderId: z.string().uuid('Valid orderId is required'),
  ticketId: z.string().uuid('Invalid ticketId').optional(),
  reason: z.string().trim().min(5, 'Please provide a clear refund reason').max(1000),
  requestedAmount: z.coerce.number().positive('Requested amount must be positive').optional(),
  idempotencyKey: z.string().trim().min(8, 'Idempotency key must be at least 8 characters').max(120)
});

export const staffTicketFilterSchema = paginationQuerySchema.extend({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  assignedTo: z.string().optional(),
  query: z.string().trim().max(120).optional()
});

export const updateStaffTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  publicReply: z.string().trim().min(1).max(3000).optional()
});

export const createInternalNoteSchema = z.object({
  content: z.string().trim().min(2, 'Note cannot be empty').max(3000)
});

export const staffRefundFilterSchema = paginationQuerySchema.extend({
  status: z.string().optional()
});

export const staffEscalationFilterSchema = paginationQuerySchema.extend({
  decision: z.string().optional()
});

export const reviewDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'MORE_INFO']),
  comment: z.string().trim().min(3, 'A review comment or reason is required').max(1500),
  internalNote: z.string().trim().max(1500).optional()
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole)
});
