import { Decimal } from 'decimal.js';
import {
  EscalationDecision,
  MessageSenderType,
  MessageVisibility,
  Prisma,
  RefundStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus
} from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { generateReferenceCode, generateSimulatedTxnRef } from '../utils/ids.js';
import { REFUND_AUTO_LIMIT_INR, formatINR, formatMoney, toDecimal, type MoneyInput } from '../utils/money.js';
import { toRefundDTO } from '../utils/dto.js';
import { evaluateOrderRefundSummary } from './order.service.js';

export interface RefundValidationResult {
  eligible: boolean;
  reasonCode:
    | 'ELIGIBLE_AUTO'
    | 'ELIGIBLE_ESCALATION_REQUIRED'
    | 'ORDER_NOT_FOUND'
    | 'NOT_DELIVERED'
    | 'WINDOW_EXPIRED'
    | 'NON_RETURNABLE'
    | 'NO_BALANCE'
    | 'EXCEEDS_BALANCE'
    | 'INVALID_AMOUNT';
  message: string;
  order?: {
    id: string;
    orderNumber: string;
    totalAmount: string;
    shippingFee: string;
    remainingBalance: string;
    daysSinceDelivery: number | null;
  };
  validatedAmount?: Decimal;
  requiresHumanReview: boolean;
}

export async function validateRefundRequestForCustomer(
  tx: Prisma.TransactionClient | typeof prisma,
  params: {
    orderIdOrNumber: string;
    customerId: string;
    reason: string;
    requestedAmount?: MoneyInput;
    excludeRefundId?: string;
  }
): Promise<RefundValidationResult> {
  const trimmed = params.orderIdOrNumber.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

  const order = await tx.order.findFirst({
    where: {
      customerId: params.customerId,
      ...(isUuid ? { id: trimmed } : { orderNumber: trimmed.toUpperCase() })
    },
    include: { items: true, refunds: true }
  });

  if (!order) {
    return {
      eligible: false,
      reasonCode: 'ORDER_NOT_FOUND',
      message: 'We could not find a matching order on your account.',
      requiresHumanReview: false
    };
  }

  const summary = evaluateOrderRefundSummary(order, params.excludeRefundId);
  const orderMeta = {
    id: order.id,
    orderNumber: order.orderNumber,
    totalAmount: formatMoney(order.totalAmount),
    shippingFee: formatMoney(order.shippingFee),
    remainingBalance: formatMoney(summary.remainingBalance),
    daysSinceDelivery: summary.daysSinceDelivery
  };

  if (order.status !== 'DELIVERED' || !order.deliveryDate) {
    return {
      eligible: false,
      reasonCode: 'NOT_DELIVERED',
      message: `Order ${order.orderNumber} is currently ${order.status}. Refunds can only be requested after delivery.`,
      order: orderMeta,
      requiresHumanReview: false
    };
  }

  if (!summary.withinReturnWindow) {
    return {
      eligible: false,
      reasonCode: 'WINDOW_EXPIRED',
      message: `Order ${order.orderNumber} was delivered ${summary.daysSinceDelivery} days ago, which is outside our 14-day return window.`,
      order: orderMeta,
      requiresHumanReview: false
    };
  }

  if (summary.returnableItemsTotal.lte(0)) {
    return {
      eligible: false,
      reasonCode: 'NON_RETURNABLE',
      message: `Items in ${order.orderNumber} belong to non-returnable categories (Digital, Perishable, or Personalized).`,
      order: orderMeta,
      requiresHumanReview: false
    };
  }

  if (summary.remainingBalance.lte(0)) {
    return {
      eligible: false,
      reasonCode: 'NO_BALANCE',
      message: `Order ${order.orderNumber} has ₹0.00 remaining refundable balance.`,
      order: orderMeta,
      requiresHumanReview: false
    };
  }

  let targetAmount = summary.remainingBalance;
  if (params.requestedAmount !== undefined && params.requestedAmount !== null) {
    const parsedReq = toDecimal(params.requestedAmount);
    if (parsedReq.lte(0)) {
      return {
        eligible: false,
        reasonCode: 'INVALID_AMOUNT',
        message: 'Requested refund amount must be greater than ₹0.00.',
        order: orderMeta,
        requiresHumanReview: false
      };
    }
    if (parsedReq.gt(summary.remainingBalance)) {
      return {
        eligible: false,
        reasonCode: 'EXCEEDS_BALANCE',
        message: `Requested amount (${formatINR(parsedReq)}) exceeds the eligible remaining refundable balance of ${formatINR(summary.remainingBalance)} for ${order.orderNumber} (shipping fees and non-returnable items are excluded).`,
        order: orderMeta,
        requiresHumanReview: false
      };
    }
    targetAmount = parsedReq;
  }

  const requiresHumanReview = targetAmount.gt(REFUND_AUTO_LIMIT_INR);

  return {
    eligible: true,
    reasonCode: requiresHumanReview ? 'ELIGIBLE_ESCALATION_REQUIRED' : 'ELIGIBLE_AUTO',
    message: requiresHumanReview
      ? `Eligible for ${formatINR(targetAmount)}. Because this exceeds ${formatINR(REFUND_AUTO_LIMIT_INR)}, human support review is required.`
      : `Eligible for automated simulated refund of ${formatINR(targetAmount)}.`,
    order: orderMeta,
    validatedAmount: targetAmount,
    requiresHumanReview
  };
}

export async function requestCustomerRefund(params: {
  customerId: string;
  orderId: string;
  ticketId?: string;
  reason: string;
  requestedAmount?: number;
  idempotencyKey: string;
}) {
  // Check idempotency key first
  const existingByKey = await prisma.refund.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
    include: { order: true, ticket: true }
  });

  if (existingByKey) {
    if (existingByKey.requestedById !== params.customerId) {
      throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key is already in use');
    }
    return {
      refund: toRefundDTO(existingByKey),
      idempotentReplay: true,
      escalated: existingByKey.status === RefundStatus.PENDING_REVIEW
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const validation = await validateRefundRequestForCustomer(tx, {
      orderIdOrNumber: params.orderId,
      customerId: params.customerId,
      reason: params.reason,
      requestedAmount: params.requestedAmount
    });

    if (!validation.eligible || !validation.order || !validation.validatedAmount) {
      if (validation.reasonCode === 'ORDER_NOT_FOUND') {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }
      throw new AppError(422, validation.reasonCode, validation.message, {
        order: validation.order
      });
    }

    let ticketId = params.ticketId;
    if (ticketId) {
      const ownedTicket = await tx.ticket.findFirst({
        where: { id: ticketId, customerId: params.customerId }
      });
      if (!ownedTicket) {
        throw new AppError(404, 'TICKET_NOT_FOUND', 'Ticket not found');
      }
    } else {
      const createdTicket = await tx.ticket.create({
        data: {
          ticketNumber: generateReferenceCode('TKT'),
          customerId: params.customerId,
          orderId: validation.order.id,
          subject: `Refund request for ${validation.order.orderNumber}`,
          description: params.reason,
          category: TicketCategory.REFUND_RETURN,
          status: validation.requiresHumanReview ? TicketStatus.ESCALATED : TicketStatus.RESOLVED,
          priority: validation.requiresHumanReview ? TicketPriority.HIGH : TicketPriority.MEDIUM,
          resolvedAt: validation.requiresHumanReview ? null : new Date()
        }
      });
      ticketId = createdTicket.id;

      await tx.message.create({
        data: {
          ticketId,
          senderType: MessageSenderType.CUSTOMER,
          senderUserId: params.customerId,
          visibility: MessageVisibility.PUBLIC,
          content: `Submitted refund request for ${validation.order.orderNumber}: ${params.reason}`
        }
      });
    }

    const refundNumber = generateReferenceCode('RFD');
    const amountStr = formatMoney(validation.validatedAmount);

    if (validation.requiresHumanReview) {
      const refund = await tx.refund.create({
        data: {
          refundNumber,
          orderId: validation.order.id,
          ticketId,
          requestedById: params.customerId,
          amount: amountStr,
          reason: params.reason,
          status: RefundStatus.PENDING_REVIEW,
          idempotencyKey: params.idempotencyKey
        },
        include: { order: true, ticket: true }
      });

      await tx.escalation.create({
        data: {
          ticketId,
          refundId: refund.id,
          summary: `Refund ${refundNumber} (${formatINR(amountStr)}) for ${validation.order.orderNumber} exceeds ₹5,000.00 automated limit and requires human approval.`,
          priority: TicketPriority.HIGH,
          decision: EscalationDecision.PENDING
        }
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.ESCALATED,
          priority: TicketPriority.HIGH
        }
      });

      await tx.message.create({
        data: {
          ticketId,
          senderType: MessageSenderType.SYSTEM,
          visibility: MessageVisibility.PUBLIC,
          content: `Refund ${refundNumber} for ${formatINR(amountStr)} has been queued for human staff review because it exceeds the ₹5,000.00 automated limit. (Simulated demo refund)`,
          metadata: {
            event: 'REFUND_ESCALATED',
            refundNumber,
            amount: amountStr,
            simulated: true
          }
        }
      });

      await tx.auditEvent.create({
        data: {
          actorId: params.customerId,
          ticketId,
          refundId: refund.id,
          eventType: 'REFUND_ESCALATED',
          details: {
            refundNumber,
            orderNumber: validation.order.orderNumber,
            amount: amountStr,
            threshold: '5000.00'
          }
        }
      });

      return { refund, escalated: true };
    }

    // Eligible & <= ₹5,000 -> simulate automated completion
    const simulatedTxnRef = generateSimulatedTxnRef();
    const now = new Date();
    const refund = await tx.refund.create({
      data: {
        refundNumber,
        orderId: validation.order.id,
        ticketId,
        requestedById: params.customerId,
        amount: amountStr,
        reason: params.reason,
        status: RefundStatus.COMPLETED,
        simulatedTxnRef,
        idempotencyKey: params.idempotencyKey,
        completedAt: now
      },
      include: { order: true, ticket: true }
    });

    await tx.message.create({
      data: {
        ticketId,
        senderType: MessageSenderType.SYSTEM,
        visibility: MessageVisibility.PUBLIC,
        content: `Simulated refund ${refundNumber} for ${formatINR(amountStr)} completed (Demo Transaction Ref: ${simulatedTxnRef}). No real money was transferred.`,
        metadata: {
          event: 'REFUND_SIMULATED_COMPLETED',
          refundNumber,
          simulatedTxnRef,
          amount: amountStr,
          simulated: true
        }
      }
    });

    await tx.auditEvent.create({
      data: {
        actorId: params.customerId,
        ticketId,
        refundId: refund.id,
        eventType: 'REFUND_SIMULATED_COMPLETED',
        details: {
          refundNumber,
          orderNumber: validation.order.orderNumber,
          amount: amountStr,
          simulatedTxnRef
        }
      }
    });

    return { refund, escalated: false };
  });

  return {
    refund: toRefundDTO(result.refund),
    idempotentReplay: false,
    escalated: result.escalated
  };
}

export async function listCustomerRefunds(customerId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const [total, refunds] = await Promise.all([
    prisma.refund.count({ where: { requestedById: customerId } }),
    prisma.refund.findMany({
      where: { requestedById: customerId },
      include: { order: true, ticket: true },
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

export async function getCustomerRefundById(customerId: string, refundId: string) {
  const refund = await prisma.refund.findFirst({
    where: { id: refundId, requestedById: customerId },
    include: { order: true, ticket: true, reviewedBy: { select: { id: true, name: true, email: true } } }
  });

  if (!refund) {
    throw new AppError(404, 'REFUND_NOT_FOUND', 'Refund record not found');
  }

  return toRefundDTO(refund);
}
