const REDACTED_KEYS = new Set(['password', 'passwordhash', 'token', 'authorization', 'apikey', 'secret']);

export function sanitizeLogMeta(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeLogMeta);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (REDACTED_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = sanitizeLogMeta(v);
      }
    }
    return out;
  }
  return value;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        message,
        ...(meta ? { meta: sanitizeLogMeta(meta) } : {})
      })
    );
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        message,
        ...(meta ? { meta: sanitizeLogMeta(meta) } : {})
      })
    );
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message,
        ...(meta ? { meta: sanitizeLogMeta(meta) } : {})
      })
    );
  }
};
