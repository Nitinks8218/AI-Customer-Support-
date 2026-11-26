import crypto from 'node:crypto';

export function generateReferenceCode(prefix: string): string {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  const stamp = Date.now().toString().slice(-4);
  return `${prefix}-${stamp}${random}`;
}

export function generateSimulatedTxnRef(): string {
  return `SIM-TXN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function generateUuid(): string {
  return crypto.randomUUID();
}
