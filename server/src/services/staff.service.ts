import {
  EscalationDecision,
  MessageSenderType,
  MessageVisibility,
  Prisma,
  RefundStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole
} from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { generateSimulatedTxnRef } from '../utils/ids.js';
import { formatINR, formatMoney } from '../utils/money.js';
import {
  toAuditEventDTO,
  toEscalationDTO,
  toInternalNoteDTO,
  toMessageDTO,
  toRefundDTO,
  toTicketDTO,
  toUserDTO
} from '../utils/dto.js';
import { validateRefundRequestForCustomer } from './refund.service.js';

const ALLOWED_TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['OPEN', 'WAITING_FOR_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED'],
  WAITING_FOR_CUSTOMER: ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['OPEN']
};

export async function getStaffDashboard() {
  const [
    openCount,
    inProgressCount,
    escalatedCount,
    urgentCount,
    pendingRefundsCount,
    pendingEscalationsCount,
    recentEscalations,
    urgentTickets
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
    prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
    prisma.ticket.count({ where: { status: TicketStatus.ESCALATED } }),
    prisma.ticket.count({
      where: {
        priority: TicketPriority.URGENT,
        status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }
      }
    }),
    prisma.refund.count({ where: { status: RefundStatus.PENDING_REVIEW } }),
    prisma.escalation.count({ where: { decision: EscalationDecision.PENDING } }),
    prisma.escalation.findMany({
      where: { decision: EscalationDecision.PENDING },
      include: {
        ticket: { include: { customer: { select: { id: true, name: true, email: true } } } },
        refund: true,
        assignedTo: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.ticket.findMany({
      where: { status: { in: [TicketStatus.OPEN, TicketStatus.ESCALATED, TicketStatus.IN_PROGRESS] } },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        order: true
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: 6
    })
  ]);

  return {
    metrics: {
      openTickets: openCount,
      inProgressTickets: inProgressCount,
      escalatedTickets: escalatedCount,
      urgentActiveTickets: urgentCount,
      pendingRefundReviews: pendingRefundsCount,
      pendingEscalations: pendingEscalationsCount
    },
    pendingEscalations: recentEscalations.map(toEscalationDTO),
    priorityQueue: urgentTickets.map(toTicketDTO)
  };
}

export async function listStaffTickets(filters: {
  page: number;
  limit: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
  query?: string;
}) {
  const where: Prisma.TicketWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.category) where.category = filters.category;
  if (filters.assignedTo === 'unassigned') {
    where.assignedToId = null;
  } else if (filters.assignedTo) {
    where.assignedToId = filters.assignedTo;
  }
  if (filters.query && filters.query.trim().length > 0) {
    const q = filters.query.trim();
    where.OR = [
      { ticketNumber: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { customer: { email: { contains: q, mode: 'insensitive' } } },
      { order: { orderNumber: { contains: q, mode: 'insensitive' } } }
    ];
  }

  const skip = (filters.page - 1) * filters.limit;
  const [total, tickets, staffUsers] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        order: true
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: filters.limit
    }),
    prisma.user.findMany({
      where: { role: { in: [UserRole.SUPPORT, UserRole.ADMIN] } },
      select: { id: true, name: true, email: true, role: true }
    })
  ]);

  return {
    items: tickets.map(toTicketDTO),
    staffAgents: staffUsers,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit))
    }
  };
}

export async function getStaffTicketDetail(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      customer: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      order: { include: { items: true } },
      messages: {
        include: { senderUser: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' }
      },
      internalNotes: {
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' }
      },
      refunds: {
        include: { order: true, ticket: true, reviewedBy: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      },
      escalations: {
        include: {
          refund: true,
          assignedTo: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      },
      auditEvents: {
        include: { actor: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
  }

  const staffAgents = await prisma.user.findMany({
    where: { role: { in: [UserRole.SUPPORT, UserRole.ADMIN] } },
    select: { id: true, name: true, email: true, role: true }
  });

  return {
    ticket: toTicketDTO(ticket),
    messages: ticket.messages.map(toMessageDTO),
    internalNotes: ticket.internalNotes.map(toInternalNoteDTO),
    refunds: ticket.refunds.map(toRefundDTO),
    escalations: ticket.escalations.map(toEscalationDTO),
    auditEvents: ticket.auditEvents.map(toAuditEventDTO),
    staffAgents
  };
}

export async function updateStaffTicket(
  ticketId: string,
  staffUserId: string,
  input: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: string | null;
    publicReply?: string;
  }
) {
  const existing = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!existing) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
  }

  if (input.status && input.status !== existing.status) {
    const allowed = ALLOWED_TICKET_TRANSITIONS[existing.status];
    if (!allowed.includes(input.status)) {
      throw new AppError(
        422,
        'INVALID_STATUS_TRANSITION',
        `Cannot transition ticket from ${existing.status} to ${input.status}`
      );
    }
  }

  if (input.assignedToId) {
    const assignee = await prisma.user.findFirst({
      where: { id: input.assignedToId, role: { in: [UserRole.SUPPORT, UserRole.ADMIN] } }
    });
    if (!assignee) {
      throw new AppError(400, 'INVALID_ASSIGNEE', 'Assignee must be a support or admin user');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextStatus = input.status ?? existing.status;
    const resolvedAt =
      nextStatus === TicketStatus.RESOLVED || nextStatus === TicketStatus.CLOSED
        ? existing.resolvedAt ?? new Date()
        : nextStatus === TicketStatus.OPEN || nextStatus === TicketStatus.IN_PROGRESS
          ? null
          : existing.resolvedAt;

    const ticket = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: nextStatus,
        priority: input.priority ?? existing.priority,
        assignedToId: input.assignedToId !== undefined ? input.assignedToId : existing.assignedToId,
        resolvedAt
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        order: true
      }
    });

    if (input.publicReply) {
      await tx.message.create({
        data: {
          ticketId,
          senderType: MessageSenderType.STAFF,
          senderUserId: staffUserId,
          visibility: MessageVisibility.PUBLIC,
          content: input.publicReply
        }
      });
    }

    if (input.status && input.status !== existing.status) {
      await tx.message.create({
        data: {
          ticketId,
          senderType: MessageSenderType.SYSTEM,
          senderUserId: staffUserId,
          visibility: MessageVisibility.PUBLIC,
          content: `Ticket status updated from ${existing.status} to ${input.status}.`,
          metadata: { event: 'STATUS_CHANGED', from: existing.status, to: input.status }
        }
      });
    }

    await tx.auditEvent.create({
      data: {
        actorId: staffUserId,
        ticketId,
        eventType: 'TICKET_UPDATED_BY_STAFF',
        details: {
          previousStatus: existing.status,
          newStatus: nextStatus,
          previousPriority: existing.priority,
          newPriority: input.priority ?? existing.priority,
          assignedToId: ticket.assignedToId,
          hasPublicReply: Boolean(input.publicReply)
        }
      }
    });

    return ticket;
  });

  return toTicketDTO(updated);
}

export async function addStaffInternalNote(ticketId: string, authorId: string, content: string) {
  const existing = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!existing) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
  }

  const note = await prisma.$transaction(async (tx) => {
    const created = await tx.internalNote.create({
      data: {
        ticketId,
        authorId,
        content
      },
      include: { author: { select: { id: true, name: true, role: true } } }
    });

    await tx.auditEvent.create({
      data: {
        actorId: authorId,
        ticketId,
        eventType: 'INTERNAL_NOTE_ADDED',
        details: { noteId: created.id }
      }
    });

    return created;
  });

  return toInternalNoteDTO(note);
}

export async function listStaffRefunds(page = 1, limit = 10, status?: string) {
  const where: Prisma.RefundWhereInput = {};
  if (status && Object.values(RefundStatus).includes(status as RefundStatus)) {
    where.status = status as RefundStatus;
  }
  const skip = (page - 1) * limit;
  const [total, refunds] = await Promise.all([
    prisma.refund.count({ where }),
    prisma.refund.findMany({
      where,
      include: {
        order: true,
        ticket: true,
        requestedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })
  ]);

  return {
    items: refunds.map(toRefundDTO),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  };
}

export async function getStaffRefundDetail(refundId: string) {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: {
      order: { include: { items: true } },
      ticket: true,
      requestedBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
      escalations: true,
      auditEvents: {
        include: { actor: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!refund) {
    throw new AppError(404, 'REFUND_NOT_FOUND', 'Refund not found');
  }

  return {
    refund: toRefundDTO(refund),
    escalations: refund.escalations.map(toEscalationDTO),
    auditEvents: refund.auditEvents.map(toAuditEventDTO)
  };
}

export async function decideRefund(
  refundId: string,
  staffUserId: string,
  input: { decision: 'APPROVED' | 'REJECTED' | 'MORE_INFO'; comment: string; internalNote?: string }
) {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({
      where: { id: refundId },
      include: { order: true, ticket: true }
    });

    if (!refund) {
      throw new AppError(404, 'REFUND_NOT_FOUND', 'Refund not found');
    }

    if (
      refund.status !== RefundStatus.PENDING_REVIEW &&
      refund.status !== RefundStatus.REQUESTED
    ) {
      throw new AppError(
        422,
        'REFUND_ALREADY_DECIDED',
        `Refund ${refund.refundNumber} is currently ${refund.status} and cannot be reviewed again.`
      );
    }

    const now = new Date();

    if (input.decision === 'APPROVED') {
      // Revalidate ownership, order state, return window, and remaining balance at decision time
      const revalidation = await validateRefundRequestForCustomer(tx, {
        orderIdOrNumber: refund.orderId,
        customerId: refund.requestedById,
        reason: refund.reason,
        requestedAmount: refund.amount,
        excludeRefundId: refund.id
      });

      if (!revalidation.eligible) {
        throw new AppError(
          422,
          'REVALIDATION_FAILED',
          `Cannot approve refund ${refund.refundNumber}: ${revalidation.message}`
        );
      }

      const txnRef = generateSimulatedTxnRef();
      const updatedRefund = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.COMPLETED,
          reviewedById: staffUserId,
          reviewComment: input.comment,
          simulatedTxnRef: txnRef,
          reviewedAt: now,
          completedAt: now
        },
        include: {
          order: true,
          ticket: true,
          requestedBy: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { id: true, name: true, email: true } }
        }
      });

      await tx.escalation.updateMany({
        where: { refundId: refund.id, decision: { in: [EscalationDecision.PENDING, EscalationDecision.MORE_INFO] } },
        data: {
          decision: EscalationDecision.APPROVED,
          reviewedById: staffUserId,
          internalNote: input.internalNote ?? input.comment,
          resolvedAt: now
        }
      });

      await tx.ticket.update({
        where: { id: refund.ticketId },
        data: { status: TicketStatus.RESOLVED, resolvedAt: now }
      });

      await tx.message.create({
        data: {
          ticketId: refund.ticketId,
          senderType: MessageSenderType.STAFF,
          senderUserId: staffUserId,
          visibility: MessageVisibility.PUBLIC,
          content: `Your refund ${refund.refundNumber} (${formatINR(refund.amount)}) has been approved by support. Simulated Transaction Ref: ${txnRef}. Staff note: ${input.comment}`,
          metadata: {
            event: 'REFUND_STAFF_APPROVED',
            refundNumber: refund.refundNumber,
            simulatedTxnRef: txnRef,
            simulated: true
          }
        }
      });

      if (input.internalNote) {
        await tx.internalNote.create({
          data: {
            ticketId: refund.ticketId,
            authorId: staffUserId,
            content: `[Refund ${refund.refundNumber} Approved] ${input.internalNote}`
          }
        });
      }

      await tx.auditEvent.create({
        data: {
          actorId: staffUserId,
          ticketId: refund.ticketId,
          refundId: refund.id,
          eventType: 'REFUND_APPROVED_AND_SIMULATED',
          details: {
            refundNumber: refund.refundNumber,
            amount: formatMoney(refund.amount),
            simulatedTxnRef: txnRef,
            comment: input.comment
          }
        }
      });

      return toRefundDTO(updatedRefund);
    }

    if (input.decision === 'REJECTED') {
      const updatedRefund = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.REJECTED,
          reviewedById: staffUserId,
          reviewComment: input.comment,
          reviewedAt: now
        },
        include: {
          order: true,
          ticket: true,
          requestedBy: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { id: true, name: true, email: true } }
        }
      });

      await tx.escalation.updateMany({
        where: { refundId: refund.id, decision: { in: [EscalationDecision.PENDING, EscalationDecision.MORE_INFO] } },
        data: {
          decision: EscalationDecision.REJECTED,
          reviewedById: staffUserId,
          internalNote: input.internalNote ?? input.comment,
          resolvedAt: now
        }
      });

      await tx.ticket.update({
        where: { id: refund.ticketId },
        data: { status: TicketStatus.CLOSED, resolvedAt: now }
      });

      await tx.message.create({
        data: {
          ticketId: refund.ticketId,
          senderType: MessageSenderType.STAFF,
          senderUserId: staffUserId,
          visibility: MessageVisibility.PUBLIC,
          content: `Your refund request ${refund.refundNumber} (${formatINR(refund.amount)}) could not be approved. Reason: ${input.comment}`,
          metadata: { event: 'REFUND_STAFF_REJECTED', refundNumber: refund.refundNumber }
        }
      });

      if (input.internalNote) {
        await tx.internalNote.create({
          data: {
            ticketId: refund.ticketId,
            authorId: staffUserId,
            content: `[Refund ${refund.refundNumber} Rejected] ${input.internalNote}`
          }
        });
      }

      await tx.auditEvent.create({
        data: {
          actorId: staffUserId,
          ticketId: refund.ticketId,
          refundId: refund.id,
          eventType: 'REFUND_REJECTED',
          details: { refundNumber: refund.refundNumber, comment: input.comment }
        }
      });

      return toRefundDTO(updatedRefund);
    }

    // MORE_INFO
    const updatedRefund = await tx.refund.update({
      where: { id: refund.id },
      data: {
        reviewedById: staffUserId,
        reviewComment: input.comment,
        reviewedAt: now
      },
      include: {
        order: true,
        ticket: true,
        requestedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } }
      }
    });

    await tx.escalation.updateMany({
      where: { refundId: refund.id, decision: EscalationDecision.PENDING },
      data: {
        decision: EscalationDecision.MORE_INFO,
        requestedInfo: input.comment,
        reviewedById: staffUserId,
        internalNote: input.internalNote ?? null
      }
    });

    await tx.ticket.update({
      where: { id: refund.ticketId },
      data: { status: TicketStatus.WAITING_FOR_CUSTOMER }
    });

    await tx.message.create({
      data: {
        ticketId: refund.ticketId,
        senderType: MessageSenderType.STAFF,
        senderUserId: staffUserId,
        visibility: MessageVisibility.PUBLIC,
        content: `Support needs additional details before reviewing refund ${refund.refundNumber}: ${input.comment}`,
        metadata: { event: 'REFUND_MORE_INFO_REQUESTED', refundNumber: refund.refundNumber }
      }
    });

    await tx.auditEvent.create({
      data: {
        actorId: staffUserId,
        ticketId: refund.ticketId,
        refundId: refund.id,
        eventType: 'REFUND_MORE_INFO_REQUESTED',
        details: { refundNumber: refund.refundNumber, comment: input.comment }
      }
    });

    return toRefundDTO(updatedRefund);
  });
}

export async function listStaffEscalations(page = 1, limit = 10, decision?: string) {
  const where: Prisma.EscalationWhereInput = {};
  if (decision && Object.values(EscalationDecision).includes(decision as EscalationDecision)) {
    where.decision = decision as EscalationDecision;
  }

  const skip = (page - 1) * limit;
  const [total, escalations] = await Promise.all([
    prisma.escalation.count({ where }),
    prisma.escalation.findMany({
      where,
      include: {
        ticket: { include: { customer: { select: { id: true, name: true, email: true } } } },
        refund: true,
        assignedTo: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })
  ]);

  return {
    items: escalations.map(toEscalationDTO),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  };
}

export async function getStaffEscalationDetail(escalationId: string) {
  const escalation = await prisma.escalation.findUnique({
    where: { id: escalationId },
    include: {
      ticket: {
        include: {
          customer: { select: { id: true, name: true, email: true } },
          order: { include: { items: true } },
          messages: {
            include: { senderUser: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' }
          },
          internalNotes: {
            include: { author: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' }
          }
        }
      },
      refund: true,
      assignedTo: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } }
    }
  });

  if (!escalation) {
    throw new AppError(404, 'ESCALATION_NOT_FOUND', 'Escalation not found');
  }

  return {
    escalation: toEscalationDTO(escalation),
    ticket: toTicketDTO(escalation.ticket),
    messages: escalation.ticket.messages.map(toMessageDTO),
    internalNotes: escalation.ticket.internalNotes.map(toInternalNoteDTO)
  };
}

export async function decideEscalation(
  escalationId: string,
  staffUserId: string,
  input: { decision: 'APPROVED' | 'REJECTED' | 'MORE_INFO'; comment: string; internalNote?: string }
) {
  const escalation = await prisma.escalation.findUnique({
    where: { id: escalationId }
  });

  if (!escalation) {
    throw new AppError(404, 'ESCALATION_NOT_FOUND', 'Escalation not found');
  }

  if (escalation.refundId) {
    const refundDto = await decideRefund(escalation.refundId, staffUserId, input);
    const updatedEsc = await prisma.escalation.findUnique({
      where: { id: escalationId },
      include: {
        ticket: { include: { customer: { select: { id: true, name: true, email: true } } } },
        refund: true,
        assignedTo: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } }
      }
    });
    return {
      escalation: updatedEsc ? toEscalationDTO(updatedEsc) : null,
      refund: refundDto
    };
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const esc = await tx.escalation.update({
      where: { id: escalationId },
      data: {
        decision: input.decision as EscalationDecision,
        internalNote: input.internalNote ?? input.comment,
        requestedInfo: input.decision === 'MORE_INFO' ? input.comment : null,
        reviewedById: staffUserId,
        resolvedAt: input.decision === 'MORE_INFO' ? null : now
      },
      include: {
        ticket: { include: { customer: { select: { id: true, name: true, email: true } } } },
        refund: true,
        assignedTo: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } }
      }
    });

    await tx.ticket.update({
      where: { id: escalation.ticketId },
      data: {
        status:
          input.decision === 'MORE_INFO'
            ? TicketStatus.WAITING_FOR_CUSTOMER
            : input.decision === 'APPROVED'
              ? TicketStatus.RESOLVED
              : TicketStatus.CLOSED,
        resolvedAt: input.decision === 'MORE_INFO' ? null : now
      }
    });

    await tx.message.create({
      data: {
        ticketId: escalation.ticketId,
        senderType: MessageSenderType.STAFF,
        senderUserId: staffUserId,
        visibility: MessageVisibility.PUBLIC,
        content: `Escalation review (${input.decision}): ${input.comment}`
      }
    });

    await tx.auditEvent.create({
      data: {
        actorId: staffUserId,
        ticketId: escalation.ticketId,
        eventType: `ESCALATION_${input.decision}`,
        details: { escalationId, comment: input.comment }
      }
    });

    return esc;
  });

  return { escalation: toEscalationDTO(updated), refund: null };
}

export async function listUsersForAdmin() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });
  return users.map(toUserDTO);
}

export async function updateUserRoleByAdmin(targetUserId: string, adminUserId: string, role: UserRole) {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }
  if (target.id === adminUserId && role !== UserRole.ADMIN) {
    throw new AppError(422, 'CANNOT_DEMOTE_SELF', 'Admins cannot remove their own ADMIN role');
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { role },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });

  await prisma.auditEvent.create({
    data: {
      actorId: adminUserId,
      eventType: 'USER_ROLE_UPDATED',
      details: { targetUserId, previousRole: target.role, newRole: role }
    }
  });

  return toUserDTO(updated);
}
