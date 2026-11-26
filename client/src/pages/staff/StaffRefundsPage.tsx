import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { apiRequest, formatDateTime, formatINR } from '../../lib/api';
import type { Refund } from '../../types/api';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Skeleton,
  StatusBadge
} from '../../components/ui/Primitives';

export function StaffRefundsPage() {
  const [status, setStatus] = useState('');

  const params = new URLSearchParams({ limit: '25' });
  if (status) params.set('status', status);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['staff-refunds', status],
    queryFn: async () => (await apiRequest<Refund[]>(`/staff/refunds?${params.toString()}`)).data
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financial Operations (Simulated)"
        title="Refund Reviews"
        description="Inspect simulated demo refunds, pending high-value reviews (> ₹5,000), and completed transaction references."
        actions={
          <Select
            aria-label="Filter refund status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-48"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : isError || !data ? (
        <ErrorState message={(error as Error)?.message ?? 'Unable to load refunds'} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          title="No refund records match"
          description="Try clearing the status filter to inspect all refunds."
        />
      ) : (
        <div className="space-y-3">
          {data.map((ref) => (
            <Card key={ref.id} className="p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-ink">{ref.refundNumber}</span>
                    <StatusBadge status={ref.status} />
                    <span className="rounded bg-subtle px-2 py-0.5 font-mono text-[10px] font-semibold text-ink-muted">
                      SIMULATED
                    </span>
                  </div>
                  <p className="text-sm font-medium text-ink">{ref.reason}</p>
                  <p className="text-xs text-ink-muted">
                    {ref.requestedBy?.name} · Order {ref.orderNumber} · {formatDateTime(ref.createdAt)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:text-right">
                  <div>
                    <p className="font-mono text-lg font-bold tabular-nums text-ink">
                      {formatINR(ref.amount)}
                    </p>
                    {ref.simulatedTxnRef && (
                      <p className="font-mono text-[11px] text-emerald-ops">{ref.simulatedTxnRef}</p>
                    )}
                  </div>
                  <Link to={`/staff/tickets/${ref.ticketId}`}>
                    <Button variant="outline" size="sm">
                      Case Workbench
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
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
