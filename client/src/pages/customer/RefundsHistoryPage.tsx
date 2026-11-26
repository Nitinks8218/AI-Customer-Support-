import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw, ShieldCheck, ExternalLink } from 'lucide-react';
import { apiRequest, formatDateTime, formatINR } from '../../lib/api';
import type { Refund } from '../../types/api';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  StatusBadge
} from '../../components/ui/Primitives';

export function RefundsHistoryPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customer-refunds'],
    queryFn: async () => (await apiRequest<Refund[]>('/refunds?limit=25')).data
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message={(error as Error)?.message ?? 'Unable to load refunds'} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Demo Refund Ledger"
        title="Simulated Refunds"
        description="Track automated and staff-reviewed refund requests. All transactions are simulated for demonstration and never move real money."
        actions={
          <Link to="/app/orders">
            <Button variant="outline">Browse Eligible Orders</Button>
          </Link>
        }
      />

      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-subtle/60 px-4 py-3 text-xs text-ink-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-ops" />
        <span>
          <strong>Simulation Notice:</strong> Eligible claims ≤ ₹5,000 settle immediately as demo
          transactions; claims &gt; ₹5,000 enter <span className="font-mono">PENDING_REVIEW</span>{' '}
          for human staff approval.
        </span>
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="No refund requests yet"
          description="You can request a simulated refund from an eligible delivered order or via AI chat."
          action={
            <Link to="/app/orders">
              <Button>View Orders</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3.5">
          {data.map((refund) => (
            <Card key={refund.id} className="p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-ink">
                      <RotateCcw className="h-4 w-4 text-accent" />
                      {refund.refundNumber}
                    </span>
                    <StatusBadge status={refund.status} />
                    <span className="rounded bg-subtle px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-ink-muted">
                      Simulated Demo
                    </span>
                  </div>
                  <p className="text-sm font-medium text-ink">{refund.reason}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    {refund.orderNumber && <span>Order {refund.orderNumber}</span>}
                    <span>Requested {formatDateTime(refund.createdAt)}</span>
                    {refund.simulatedTxnRef && (
                      <span className="font-mono font-semibold text-emerald-ops">
                        Ref: {refund.simulatedTxnRef}
                      </span>
                    )}
                  </div>
                  {refund.reviewComment && (
                    <p className="mt-2 rounded-lg bg-subtle/60 px-3 py-2 text-xs text-ink">
                      <strong>Staff Review:</strong> {refund.reviewComment}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-border pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                  <p className="font-mono text-xl font-bold tabular-nums text-ink">
                    {formatINR(refund.amount)}
                  </p>
                  <Link
                    to={`/app/tickets/${refund.ticketId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                  >
                    Open Ticket {refund.ticketNumber}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
