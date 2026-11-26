import {
  MessageSenderType,
  MessageVisibility,
  TicketCategory,
  TicketPriority,
  TicketStatus
} from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { generateReferenceCode } from '../utils/ids.js';
import { toMessageDTO, toRefundDTO, toTicketDTO } from '../utils/dto.js';

export async function getCustomerDashboard(customerId: string) {
  const [orders, tickets, refunds] = await Promise.all([
    prisma.order.findMany({
      where: { customerId },
      include: { items: true },
      orderBy: { placedAt: 'desc' },
      take: 5
    }),
    prisma.ticket.findMany({
      where: { customerId },
      include: { order: true },
      orderBy: { updatedAt: 'desc' },
      take: 5
    }),
    prisma.refund.findMany({
      where: { requestedById: customerId },
      include: { order: true, ticket: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  const [totalOrders, activeTicketsCount, pendingRefundsCount] = await Promise.all([
    prisma.order.count({ where: { customerId } }),
    prisma.ticket.count({
      where: { customerId, status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } }
    }),
    prisma.refund.count({
      where: { requestedById: customerId, status: { in: ['REQUESTED', 'PROCESSING', 'PENDING_REVIEW'] } }
    })
  ]);

  return {
    metrics: {
      totalOrders,
      activeTickets: activeTicketsCount,
      pendingRefunds: pendingRefundsCount
    },
    recentOrders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      placedAt: o.placedAt.toISOString(),
      deliveryDate: o.deliveryDate ? o.deliveryDate.toISOString() : null,
      totalAmount: o.totalAmount.toFixed(2),
      currency: o.currency,
      itemCount: o.items.length
    })),
    recentTickets: tickets.map((t) => toTicketDTO(t)),
    recentRefunds: refunds.map((r) => toRefundDTO(r))
  };
}

export async function listCustomerTickets(customerId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const [total, tickets] = await Promise.all([
    prisma.ticket.count({ where: { customerId } }),
    prisma.ticket.findMany({
      where: { customerId },
      include: {
        order: { include: { items: true } },
        assignedTo: { select: { id: true, name: true, email: true } }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit
    })
  ]);

  return {
    items: tickets.map((t) => toTicketDTO(t)),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  };
}

export async function createCustomerTicket(params: {
  customerId: string;
  category: TicketCategory;
  subject: string;
  description: string;
  orderId?: string | null;
}) {
  if (params.orderId) {
    const ownedOrder = await prisma.order.findFirst({
      where: { id: params.orderId, customerId: params.customerId }
    });
    if (!ownedOrder) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Linked order not found');
    }
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        ticketNumber: generateReferenceCode('TKT'),
        customerId: params.customerId,
        orderId: params.orderId ?? null,
        subject: params.subject.trim(),
        description: params.description.trim(),
        category: params.category,
        status: TicketStatus.OPEN,
        priority: TicketPriority.MEDIUM
      },
      include: {
        order: { include: { items: true } },
        assignedTo: { select: { id: true, name: true, email: true } }
      }
    });

    await tx.message.create({
      data: {
        ticketId: created.id,
        senderType: MessageSenderType.CUSTOMER,
        senderUserId: params.customerId,
        visibility: MessageVisibility.PUBLIC,
        content: params.description.trim()
      }
    });

    await tx.auditEvent.create({
      data: {
        actorId: params.customerId,
        ticketId: created.id,
        eventType: 'TICKET_CREATED',
        details: {
          ticketNumber: created.ticketNumber,
          category: created.category,
          orderId: created.orderId
        }
      }
    });

    return created;
  });

  return toTicketDTO(ticket);
}

export async function getCustomerTicketDetail(customerId: string, ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, customerId },
    include: {
      order: { include: { items: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      refunds: {
        include: { order: true, ticket: true },
        orderBy: { createdAt: 'desc' }
      },
      escalations: {
        orderBy: { createdAt: 'desc' }
      },
      messages: {
        where: { visibility: MessageVisibility.PUBLIC },
        include: { senderUser: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
  }

  return {
    ticket: toTicketDTO(ticket),
    messages: ticket.messages.map(toMessageDTO),
    refunds: ticket.refunds.map(toRefundDTO),
    escalations: ticket.escalations.map((e) => ({
      id: e.id,
      decision: e.decision,
      priority: e.priority,
      requestedInfo: e.requestedInfo,
      createdAt: e.createdAt.toISOString(),
      resolvedAt: e.resolvedAt ? e.resolvedAt.toISOString() : null
    }))
  };
}

export async function getCustomerTicketMessages(customerId: string, ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, customerId },
    select: { id: true }
  });
  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
  }

  const messages = await prisma.message.findMany({
    where: { ticketId, visibility: MessageVisibility.PUBLIC },
    include: { senderUser: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' }
  });

  return messages.map(toMessageDTO);
}
