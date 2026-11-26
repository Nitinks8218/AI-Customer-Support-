import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MessageSquarePlus,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { apiRequest, ApiError, formatDateOnly, formatINR } from '../../lib/api';
import type { Order, Refund } from '../../types/api';
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  FormField,
  Input,
  PageHeader,
  Skeleton,
  StatusBadge,
  Textarea
} from '../../components/ui/Primitives';
import { useToast } from '../../components/ui/Toast';

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => `ui-${crypto.randomUUID()}`);

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customer-order', orderId],
    queryFn: async () => (await apiRequest<Order>(`/orders/${orderId}`)).data,
    enabled: Boolean(orderId)
  });

  const refundMutation = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('Order missing');
      const parsedAmount = requestedAmount.trim() ? Number(requestedAmount) : undefined;
      return apiRequest<{ refund: Refund; escalated: boolean }>('/refunds', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          reason: reason.trim(),
          ...(parsedAmount ? { requestedAmount: parsedAmount } : {}),
          idempotencyKey
        })
      });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['customer-order', orderId] });
      void queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['customer-refunds'] });
      void queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
      setRefundOpen(false);
      setReason('');
      setRequestedAmount('');
      setIdempotencyKey(`ui-${crypto.randomUUID()}`);
      pushToast({
        type: 'success',
        title: res.data.escalated ? 'Refund escalated for human review' : 'Simulated refund completed',
        description: `${res.data.refund.refundNumber} (${formatINR(res.data.refund.amount)})`
      });
      navigate(`/app/tickets/${res.data.refund.ticketId}`);
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Unable to submit refund');
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError || !order) {
    return <ErrorState message={(error as Error)?.message ?? 'Order not found'} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <Link
        to="/app/orders"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Orders
      </Link>

      <PageHeader
        eyebrow="Order Details"
        title={order.orderNumber}
        description={`Placed on ${formatDateOnly(order.placedAt)}${order.deliveryDate ? ` · Delivered ${formatDateOnly(order.deliveryDate)}` : ''}`}
        actions={
          <>
            <Link to={`/app/tickets/new?orderId=${order.id}`}>
              <Button variant="outline">
                <MessageSquarePlus className="h-4 w-4" />
                Open Support Ticket
              </Button>
            </Link>
            {order.isEligibleForRefund && (
              <Button
                variant="primary"
                onClick={() => {
                  setFormError(null);
                  setRequestedAmount(order.refundableBalance ?? '');
                  setRefundOpen(true);
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Request Simulated Refund
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-bold">Order Items</h2>
              <StatusBadge status={order.status} />
            </div>
            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex flex-col justify-between gap-2 p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold text-ink">{item.productName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <span className="rounded bg-subtle px-2 py-0.5 font-mono text-[11px]">{item.category}</span>
                      <span>Qty {item.quantity} × {formatINR(item.unitPrice)}</span>
                      {!item.isReturnable && (
                        <span className="rounded bg-crimson-soft px-2 py-0.5 font-semibold text-crimson-ops">
                          Non-Returnable
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="font-mono text-sm font-bold tabular-nums text-ink">
                    {formatINR(item.lineTotal)}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-border bg-subtle/40 px-5 py-4 text-sm">
              <div className="flex justify-between text-ink-muted">
                <span>Shipping Fee (excluded from demo refunds)</span>
                <span className="font-mono tabular-nums">{formatINR(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-ink">
                <span>Order Total Paid</span>
                <span className="font-mono tabular-nums">{formatINR(order.totalAmount)}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className="p-5">
            <h2 className="text-base font-bold">Server Policy Evaluation</h2>
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-border bg-subtle/50 p-3.5">
              {order.isEligibleForRefund ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-ops" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
              )}
              <div className="text-xs leading-relaxed text-ink">
                <p className="font-semibold">
                  {order.isEligibleForRefund ? 'Eligible for Refund Request' : 'Ineligible for Automated Refund'}
                </p>
                <p className="mt-1 text-ink-muted">{order.eligibilityReason}</p>
              </div>
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Remaining Refundable</dt>
                <dd className="font-mono font-bold tabular-nums text-ink">
                  {formatINR(order.refundableBalance ?? '0')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">14-Day Return Window</dt>
                <dd className="font-medium text-ink">
                  {order.withinReturnWindow
                    ? `Active (${order.daysSinceDelivery ?? 0}d since delivery)`
                    : 'Not active'}
                </dd>
              </div>
            </dl>

            {Number(order.refundableBalance ?? 0) > 5000 && order.isEligibleForRefund && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-ochre-soft p-3 text-xs text-ochre-ops">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Refunds above ₹5,000.00 require human staff approval and will create an escalation.
                </span>
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={refundOpen}
        title={`Request Simulated Refund — ${order.orderNumber}`}
        description="Backend policy rules validate your order ownership, return window, and remaining refundable balance. Demo refunds are simulated only."
        confirmLabel="Submit Refund Request"
        loading={refundMutation.isPending}
        onCancel={() => setRefundOpen(false)}
        onConfirm={() => {
          if (reason.trim().length < 5) {
            setFormError('Please provide a reason of at least 5 characters.');
            return;
          }
          setFormError(null);
          refundMutation.mutate();
        }}
      >
        <div className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-xl bg-crimson-soft px-3.5 py-2.5 text-xs font-medium text-crimson-ops">
              {formError}
            </div>
          )}
          <FormField
            label="Refund Amount (INR)"
            htmlFor="refund-amount"
            hint={`Maximum eligible balance: ${formatINR(order.refundableBalance ?? '0')}`}
          >
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              min="1"
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
            />
          </FormField>
          <FormField label="Reason for Refund" htmlFor="refund-reason" required>
            <Textarea
              id="refund-reason"
              rows={3}
              placeholder="Describe the issue with the delivered item(s)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
        </div>
      </ConfirmDialog>
    </div>
  );
}
