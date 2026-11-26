import type {
  User,
  Order,
  OrderItem,
  Ticket,
  Message,
  Refund,
  Escalation,
  InternalNote,
  AuditEvent
} from '@prisma/client';
import { formatMoney } from '../utils/money.js';

export function toUserDTO(user: Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString()
  };
}

export function toOrderItemDTO(item: OrderItem) {
  return {
    id: item.id,
    productName: item.productName,
    category: item.category,
    isReturnable: item.isReturnable,
    quantity: item.quantity,
    unitPrice: formatMoney(item.unitPrice),
    lineTotal: formatMoney(item.lineTotal)
  };
}

export function toOrderDTO(
  order: Order & { items?: OrderItem[] },
  extra?: {
    refundableBalance?: string;
    nonReturnableTotal?: string;
    withinReturnWindow?: boolean;
    daysSinceDelivery?: number | null;
    isEligibleForRefund?: boolean;
    eligibilityReason?: string;
  }
) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.placedAt.toISOString(),
    deliveryDate: order.deliveryDate ? order.deliveryDate.toISOString() : null,
    shippingFee: formatMoney(order.shippingFee),
    totalAmount: formatMoney(order.totalAmount),
    currency: order.currency,
    items: order.items ? order.items.map(toOrderItemDTO) : [],
    ...(extra ?? {})
  };
}

export function toMessageDTO(msg: Message & { senderUser?: { id: string; name: string; role: string } | null }) {
  return {
    id: msg.id,
    ticketId: msg.ticketId,
    senderType: msg.senderType,
    senderName:
      msg.senderType === 'AI'
        ? 'Kestrel AI Assistant'
        : msg.senderType === 'SYSTEM'
          ? 'System'
          : msg.senderUser?.name ?? (msg.senderType === 'STAFF' ? 'Support Agent' : 'Customer'),
    content: msg.content,
    visibility: msg.visibility,
    metadata: msg.metadata ?? null,
    createdAt: msg.createdAt.toISOString()
  };
}

export function toTicketDTO(
  ticket: Ticket & {
    customer?: Pick<User, 'id' | 'name' | 'email'>;
    assignedTo?: Pick<User, 'id' | 'name' | 'email'> | null;
    order?: (Order & { items?: OrderItem[] }) | null;
  }
) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    customerId: ticket.customerId,
    orderId: ticket.orderId,
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    assignedToId: ticket.assignedToId,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
    ...(ticket.customer
      ? { customer: { id: ticket.customer.id, name: ticket.customer.name, email: ticket.customer.email } }
      : {}),
    ...(ticket.assignedTo !== undefined
      ? {
          assignedTo: ticket.assignedTo
            ? { id: ticket.assignedTo.id, name: ticket.assignedTo.name, email: ticket.assignedTo.email }
            : null
        }
      : {}),
    ...(ticket.order !== undefined
      ? { order: ticket.order ? toOrderDTO(ticket.order) : null }
      : {})
  };
}

export function toRefundDTO(
  refund: Refund & {
    order?: Order;
    ticket?: Ticket;
    requestedBy?: Pick<User, 'id' | 'name' | 'email'>;
    reviewedBy?: Pick<User, 'id' | 'name' | 'email'> | null;
  }
) {
  return {
    id: refund.id,
    refundNumber: refund.refundNumber,
    orderId: refund.orderId,
    ticketId: refund.ticketId,
    amount: formatMoney(refund.amount),
    currency: 'INR',
    reason: refund.reason,
    status: refund.status,
    reviewComment: refund.reviewComment,
    simulated: true,
    simulatedTxnRef: refund.simulatedTxnRef,
    createdAt: refund.createdAt.toISOString(),
    updatedAt: refund.updatedAt.toISOString(),
    reviewedAt: refund.reviewedAt ? refund.reviewedAt.toISOString() : null,
    completedAt: refund.completedAt ? refund.completedAt.toISOString() : null,
    ...(refund.order ? { orderNumber: refund.order.orderNumber, orderTotal: formatMoney(refund.order.totalAmount) } : {}),
    ...(refund.ticket ? { ticketNumber: refund.ticket.ticketNumber, ticketSubject: refund.ticket.subject } : {}),
    ...(refund.requestedBy ? { requestedBy: { id: refund.requestedBy.id, name: refund.requestedBy.name, email: refund.requestedBy.email } } : {}),
    ...(refund.reviewedBy !== undefined
      ? { reviewedBy: refund.reviewedBy ? { id: refund.reviewedBy.id, name: refund.reviewedBy.name } : null }
      : {})
  };
}

export function toEscalationDTO(
  esc: Escalation & {
    ticket?: Ticket & { customer?: Pick<User, 'id' | 'name' | 'email'> };
    refund?: Refund | null;
    assignedTo?: Pick<User, 'id' | 'name'> | null;
    reviewedBy?: Pick<User, 'id' | 'name'> | null;
  }
) {
  return {
    id: esc.id,
    ticketId: esc.ticketId,
    refundId: esc.refundId,
    summary: esc.summary,
    priority: esc.priority,
    decision: esc.decision,
    internalNote: esc.internalNote,
    requestedInfo: esc.requestedInfo,
    assignedToId: esc.assignedToId,
    reviewedById: esc.reviewedById,
    createdAt: esc.createdAt.toISOString(),
    updatedAt: esc.updatedAt.toISOString(),
    resolvedAt: esc.resolvedAt ? esc.resolvedAt.toISOString() : null,
    ...(esc.ticket
      ? {
          ticketNumber: esc.ticket.ticketNumber,
          ticketSubject: esc.ticket.subject,
          ticketStatus: esc.ticket.status,
          customer: esc.ticket.customer
            ? { id: esc.ticket.customer.id, name: esc.ticket.customer.name, email: esc.ticket.customer.email }
            : undefined
        }
      : {}),
    ...(esc.refund !== undefined
      ? {
          refund: esc.refund
            ? {
                id: esc.refund.id,
                refundNumber: esc.refund.refundNumber,
                amount: formatMoney(esc.refund.amount),
                status: esc.refund.status,
                reason: esc.refund.reason
              }
            : null
        }
      : {}),
    ...(esc.assignedTo !== undefined ? { assignedTo: esc.assignedTo } : {}),
    ...(esc.reviewedBy !== undefined ? { reviewedBy: esc.reviewedBy } : {})
  };
}

export function toInternalNoteDTO(note: InternalNote & { author?: Pick<User, 'id' | 'name' | 'role'> }) {
  return {
    id: note.id,
    ticketId: note.ticketId,
    authorId: note.authorId,
    authorName: note.author?.name ?? 'Staff',
    content: note.content,
    createdAt: note.createdAt.toISOString()
  };
}

export function toAuditEventDTO(event: AuditEvent & { actor?: Pick<User, 'id' | 'name' | 'role'> | null }) {
  return {
    id: event.id,
    actorId: event.actorId,
    actorName: event.actor?.name ?? 'System',
    actorRole: event.actor?.role ?? 'SYSTEM',
    ticketId: event.ticketId,
    refundId: event.refundId,
    eventType: event.eventType,
    details: event.details,
    createdAt: event.createdAt.toISOString()
  };
}
