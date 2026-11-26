import { Decimal } from 'decimal.js';

export type MoneyInput = string | number | Decimal | { toString(): string };

export const REFUND_AUTO_LIMIT_INR = new Decimal('5000.00');
export const RETURN_WINDOW_DAYS = 14;

export function toDecimal(value: MoneyInput): Decimal {
  return new Decimal(value.toString());
}

export function formatMoney(value: MoneyInput): string {
  return toDecimal(value).toFixed(2);
}

export function formatINR(value: MoneyInput): string {
  return `₹${toDecimal(value).toNumber().toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
