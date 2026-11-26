import { z } from 'zod';
import { EscalationDecision, TicketPriority, TicketStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { getCustomerOrderByIdentifier } from '../../services/order.service.js';
import {
  requestCustomerRefund,
  validateRefundRequestForCustomer
} from '../../services/refund.service.js';
import { searchReturnPolicy } from '../retrieval/policy.retrieval.js';
import { formatMoney } from '../../utils/money.js';

export const getOrderDetailsInputSchema = z.object({
  orderIdentifier: z.string().trim().min(2),
  customerId: z.string().uuid()
});

export const searchPolicyInputSchema = z.object({
  queryOrCategory: z.string().trim().min(1)
});

export const validateRefundInputSchema = z.object({
  orderIdentifier: z.string().trim().min(2),
  customerId: z.string().uuid(),
  reason: z.string().trim().min(2),
  requestedAmount: z.number().positive().optional()
});

export const processRefundInputSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().trim().min(2),
  ticketId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8)
});

export const escalateToHumanInputSchema = z.object({
  ticketId: z.string().uuid(),
  customerId: z.string().uuid(),
  summary: z.string().trim().min(5).max(1000),
  priority: z.nativeEnum(TicketPriority).default(TicketPriority.HIGH),
  refundId: z.string().uuid().optional()
});

export const ALLOWED_TOOL_NAMES = [
  'get_order_details',
  'search_return_policy',
  'validate_refund_request',
  'process_refund',
  'escalate_to_human'
] as const;

export type AllowedToolName = (typeof ALLOWED_TOOL_NAMES)[number];

export async function toolGetOrderDetails(raw: z.infer<typeof getOrderDetailsInputSchema>) {
  const input = getOrderDetailsInputSchema.parse(raw);
  const found = await getCustomerOrderByIdentifier(input.customerId, input.orderIdentifier);
  if (!found) {
    return {
      found: false as const,
      message: 'No order matching that identifier was found on your account.'
    };
  }

  return {
    found: true as const,
    order: {
      id: found.order.id,
      orderNumber: found.order.orderNumber,
      status: found.order.status,
      placedAt: found.order.placedAt.toISOString(),
      deliveryDate: found.order.deliveryDate ? found.order.deliveryDate.toISOString() : null,
      shippingFee: formatMoney(found.order.shippingFee),
      totalAmount: formatMoney(found.order.totalAmount),
      currency: found.order.currency,
      remainingRefundableBalance: formatMoney(found.summary.remainingBalance),
      withinReturnWindow: found.summary.withinReturnWindow,
      daysSinceDelivery: found.summary.daysSinceDelivery,
      isEligibleForRefund: found.summary.isEligibleForRefund,
      eligibilityReason: found.summary.eligibilityReason,
      items: found.order.items.map((item) => ({
        productName: item.productName,
        category: item.category,
        isReturnable: item.isReturnable,
        quantity: item.quantity,
        lineTotal: formatMoney(item.lineTotal)
      }))
    }
  };
}

export async function toolSearchReturnPolicy(raw: z.infer<typeof searchPolicyInputSchema>) {
  const input = searchPolicyInputSchema.parse(raw);
  const sections = await searchReturnPolicy(input.queryOrCategory);
  return { sections };
}

export async function toolValidateRefundRequest(raw: z.infer<typeof validateRefundInputSchema>) {
  const input = validateRefundInputSchema.parse(raw);
  return validateRefundRequestForCustomer(prisma, {
    orderIdOrNumber: input.orderIdentifier,
    customerId: input.customerId,
    reason: input.reason,
    requestedAmount: input.requestedAmount
  });
}

export async function toolProcessRefund(raw: z.infer<typeof processRefundInputSchema>) {
  const input = processRefundInputSchema.parse(raw);
  // Note: requestCustomerRefund ignores untrusted amount if above balance or validates strictly server-side
  return requestCustomerRefund({
    customerId: input.customerId,
    orderId: input.orderId,
    ticketId: input.ticketId,
    reason: input.reason,
    requestedAmount: input.amount,
    idempotencyKey: input.idempotencyKey
  });
}

export async function toolEscalateToHuman(raw: z.infer<typeof escalateToHumanInputSchema>) {
  const input = escalateToHumanInputSchema.parse(raw);
  const ticket = await prisma.ticket.findFirst({
    where: { id: input.ticketId, customerId: input.customerId }
  });
  if (!ticket) {
    return { escalated: false as const, message: 'Ticket not found' };
  }

  const escalation = await prisma.$transaction(async (tx) => {
    const created = await tx.escalation.create({
      data: {
        ticketId: ticket.id,
        refundId: input.refundId ?? null,
        summary: input.summary,
        priority: input.priority,
        decision: EscalationDecision.PENDING
      }
    });

    await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.ESCALATED,
        priority: input.priority
      }
    });

    await tx.auditEvent.create({
      data: {
        actorId: input.customerId,
        ticketId: ticket.id,
        refundId: input.refundId ?? null,
        eventType: 'TICKET_ESCALATED_BY_AGENT',
        details: {
          escalationId: created.id,
          priority: input.priority,
          summary: input.summary
        }
      }
    });

    return created;
  });

  return {
    escalated: true as const,
    escalationId: escalation.id,
    priority: escalation.priority
  };
}
