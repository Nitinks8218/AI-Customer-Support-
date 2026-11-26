import React from 'react';
import { clsx } from 'clsx';
import { Loader2, AlertTriangle, Inbox } from 'lucide-react';
import type {
  EscalationDecision,
  OrderStatus,
  RefundStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus
} from '../../types/api';

export function cn(...inputs: Array<string | undefined | false | null>) {
  return clsx(inputs);
}

export function Card({
  children,
  className,
  dark = false
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl transition-shadow',
        dark
          ? 'bg-ink-rail text-white shadow-elevated'
          : 'bg-surface text-ink shadow-card',
        className
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'emerald';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-hover shadow-sm',
    secondary: 'bg-ink-rail text-white hover:bg-[#1C273F] shadow-sm',
    outline: 'border border-border bg-surface text-ink hover:bg-subtle',
    danger: 'bg-crimson-ops text-white hover:bg-[#9F1239] shadow-sm',
    emerald: 'bg-emerald-ops text-white hover:bg-[#115E59] shadow-sm',
    ghost: 'text-ink-muted hover:bg-subtle hover:text-ink'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-5 py-3 text-sm rounded-xl'
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Input({
  className,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-subtle',
        error ? 'border-crimson-ops' : 'border-border',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      className={cn(
        'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-subtle',
        error ? 'border-crimson-ops' : 'border-border',
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-subtle',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
        {required && <span className="ml-1 text-crimson-ops">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-crimson-ops">
          {error}
        </p>
      )}
    </div>
  );
}

export function StatusBadge({
  status
}: {
  status: TicketStatus | OrderStatus | RefundStatus | EscalationDecision | string;
}) {
  const map: Record<string, { label: string; cls: string }> = {
    OPEN: { label: 'Open', cls: 'bg-accent-soft text-accent border-accent/20' },
    IN_PROGRESS: { label: 'In Progress', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
    WAITING_FOR_CUSTOMER: { label: 'Awaiting Reply', cls: 'bg-ochre-soft text-ochre-ops border-amber-300/60' },
    ESCALATED: { label: 'Escalated', cls: 'bg-crimson-soft text-crimson-ops border-rose-300/60' },
    RESOLVED: { label: 'Resolved', cls: 'bg-emerald-soft text-emerald-ops border-teal-300/60' },
    CLOSED: { label: 'Closed', cls: 'bg-subtle text-ink-muted border-border' },
    PLACED: { label: 'Placed', cls: 'bg-subtle text-ink border-border' },
    PROCESSING: { label: 'Processing', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
    SHIPPED: { label: 'Shipped', cls: 'bg-accent-soft text-accent border-accent/20' },
    DELIVERED: { label: 'Delivered', cls: 'bg-emerald-soft text-emerald-ops border-teal-300/60' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-subtle text-ink-muted border-border' },
    REQUESTED: { label: 'Requested', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
    PENDING_REVIEW: { label: 'Pending Review', cls: 'bg-ochre-soft text-ochre-ops border-amber-300/60' },
    PENDING: { label: 'Pending Review', cls: 'bg-ochre-soft text-ochre-ops border-amber-300/60' },
    APPROVED: { label: 'Approved', cls: 'bg-emerald-soft text-emerald-ops border-teal-300/60' },
    COMPLETED: { label: 'Completed (Simulated)', cls: 'bg-emerald-soft text-emerald-ops border-teal-300/60' },
    REJECTED: { label: 'Rejected', cls: 'bg-crimson-soft text-crimson-ops border-rose-300/60' },
    MORE_INFO: { label: 'More Info Requested', cls: 'bg-ochre-soft text-ochre-ops border-amber-300/60' },
    FAILED: { label: 'Failed', cls: 'bg-crimson-soft text-crimson-ops border-rose-300/60' }
  };

  const cfg = map[status] ?? { label: status.replace(/_/g, ' '), cls: 'bg-subtle text-ink border-border' };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight whitespace-nowrap',
        cfg.cls
      )}
    >
      {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const map: Record<TicketPriority, string> = {
    LOW: 'bg-subtle text-ink-muted border-border',
    MEDIUM: 'bg-sky-50 text-sky-800 border-sky-200',
    HIGH: 'bg-ochre-soft text-ochre-ops border-amber-300/70',
    URGENT: 'bg-crimson-ops text-white border-crimson-ops'
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide',
        map[priority]
      )}
    >
      {priority}
    </span>
  );
}

export function CategoryBadge({ category }: { category: TicketCategory }) {
  const labels: Record<TicketCategory, string> = {
    ORDER_DELIVERY: 'Order & Delivery',
    REFUND_RETURN: 'Refund & Return',
    PRODUCT_QUALITY: 'Product Quality',
    PAYMENT_BILLING: 'Payment & Billing',
    ACCOUNT: 'Account',
    OTHER: 'Other'
  };
  return (
    <span className="inline-flex items-center rounded-md bg-subtle px-2 py-0.5 text-[11px] font-medium text-ink-muted">
      {labels[category] ?? category}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-subtle', className)} />;
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-subtle text-ink-muted">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function ErrorState({
  message,
  onRetry
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center justify-center border border-rose-200 bg-rose-50/40 px-6 py-10 text-center">
      <AlertTriangle className="mb-3 h-7 w-7 text-crimson-ops" />
      <h3 className="text-base font-semibold text-ink">Unable to load data</h3>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  loading = false,
  onCancel,
  onConfirm,
  children
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'emerald';
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-rail/55 p-4 backdrop-blur-[2px]"
    >
      <Card className="animate-rise w-full max-w-lg p-6">
        <h2 id="confirm-dialog-title" className="text-xl font-bold text-ink">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-ink-muted">{description}</p>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
