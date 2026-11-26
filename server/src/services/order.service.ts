import { Decimal } from 'decimal.js';
import { OrderStatus, ProductCategory, RefundStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import { toOrderDTO } from '../utils/dto.js';
import { RETURN_WINDOW_DAYS, formatMoney, toDecimal, type MoneyInput } from '../utils/money.js';

const NON_RETURNABLE_CATEGORIES = new Set<ProductCategory>([
  ProductCategory.DIGITAL,
  ProductCategory.PERISHABLE,
  ProductCategory.PERSONALIZED
]);

const ACTIVE_OR_COMPLETED_REFUND_STATUSES = new Set<RefundStatus>([
  RefundStatus.REQUESTED,
  RefundStatus.PROCESSING,
  RefundStatus.PENDING_REVIEW,
  RefundStatus.APPROVED,
  RefundStatus.COMPLETED
]);

export function computeDaysSinceDelivery(deliveryDate: Date, now = new Date()): number {
  const diffMs = now.getTime() - deliveryDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function evaluateOrderRefundSummary(order: {
  status: OrderStatus;
  deliveryDate: Date | null;
  shippingFee: MoneyInput;
  totalAmount: MoneyInput;
  items: Array<{ category: ProductCategory; isReturnable: boolean; lineTotal: MoneyInput }>;
  refunds: Array<{ id: string; status: RefundStatus; amount: MoneyInput }>;
}, excludeRefundId?: string) {
  let returnableItemsTotal = new Decimal(0);
  let nonReturnableTotal = new Decimal(0);

  for (const item of order.items) {
    const line = toDecimal(item.lineTotal);
    const itemReturnable = item.isReturnable && !NON_RETURNABLE_CATEGORIES.has(item.category);
    if (itemReturnable) {
      returnableItemsTotal = returnableItemsTotal.plus(line);
    } else {
      nonReturnableTotal = nonReturnableTotal.plus(line);
    }
  }

  let alreadyClaimed = new Decimal(0);
  for (const refund of order.refunds) {
    if (excludeRefundId && refund.id === excludeRefundId) continue;
    if (ACTIVE_OR_COMPLETED_REFUND_STATUSES.has(refund.status)) {
      alreadyClaimed = alreadyClaimed.plus(toDecimal(refund.amount));
    }
  }

  const remainingBalance = Decimal.max(0, returnableItemsTotal.minus(alreadyClaimed));
  const daysSinceDelivery = order.deliveryDate ? computeDaysSinceDelivery(order.deliveryDate) : null;
  const withinReturnWindow =
    order.status === OrderStatus.DELIVERED &&
    daysSinceDelivery !== null &&
    daysSinceDelivery <= RETURN_WINDOW_DAYS;

  let isEligibleForRefund = true;
  let eligibilityReason = 'Eligible under the 14-day demo return policy.';

  if (order.status !== OrderStatus.DELIVERED || !order.deliveryDate) {
    isEligibleForRefund = false;
    eligibilityReason = `Order status is ${order.status}. Only DELIVERED orders qualify for a return/refund.`;
  } else if (!withinReturnWindow) {
    isEligibleForRefund = false;
    eligibilityReason = `Delivered ${daysSinceDelivery} days ago, which exceeds the ${RETURN_WINDOW_DAYS}-day return window.`;
  } else if (returnableItemsTotal.lte(0)) {
    isEligibleForRefund = false;
    eligibilityReason = 'All items in this order belong to non-returnable categories (Digital, Perishable, or Personalized).';
  } else if (remainingBalance.lte(0)) {
    isEligibleForRefund = false;
    eligibilityReason = 'No remaining refundable balance on this order.';
  }

  return {
    returnableItemsTotal,
    nonReturnableTotal,
    alreadyClaimed,
    remainingBalance,
    daysSinceDelivery,
    withinReturnWindow,
    isEligibleForRefund,
    eligibilityReason
  };
}

export async function listCustomerOrders(customerId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const [total, orders] = await Promise.all([
    prisma.order.count({ where: { customerId } }),
    prisma.order.findMany({
      where: { customerId },
      include: { items: true, refunds: true },
      orderBy: { placedAt: 'desc' },
      skip,
      take: limit
    })
  ]);

  const items = orders.map((order) => {
    const summary = evaluateOrderRefundSummary(order);
    return toOrderDTO(order, {
      refundableBalance: formatMoney(summary.remainingBalance),
      nonReturnableTotal: formatMoney(summary.nonReturnableTotal),
      withinReturnWindow: summary.withinReturnWindow,
      daysSinceDelivery: summary.daysSinceDelivery,
      isEligibleForRefund: summary.isEligibleForRefund,
      eligibilityReason: summary.eligibilityReason
    });
  });

  return {
    items,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  };
}

export async function getCustomerOrderById(customerId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: { items: true, refunds: true }
  });

  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }

  const summary = evaluateOrderRefundSummary(order);
  return toOrderDTO(order, {
    refundableBalance: formatMoney(summary.remainingBalance),
    nonReturnableTotal: formatMoney(summary.nonReturnableTotal),
    withinReturnWindow: summary.withinReturnWindow,
    daysSinceDelivery: summary.daysSinceDelivery,
    isEligibleForRefund: summary.isEligibleForRefund,
    eligibilityReason: summary.eligibilityReason
  });
}

export async function getCustomerOrderByIdentifier(customerId: string, identifier: string) {
  const trimmed = identifier.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  const order = await prisma.order.findFirst({
    where: {
      customerId,
      ...(isUuid ? { id: trimmed } : { orderNumber: trimmed.toUpperCase() })
    },
    include: { items: true, refunds: true }
  });

  if (!order) {
    return null;
  }

  const summary = evaluateOrderRefundSummary(order);
  return { order, summary };
}
