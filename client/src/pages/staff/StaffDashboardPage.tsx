import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, Flame, Inbox, RotateCcw, ArrowRight } from 'lucide-react';
import { apiRequest, formatDateTime, formatINR } from '../../lib/api';
import type { Escalation, Ticket } from '../../types/api';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PriorityBadge,
  Skeleton,
  StatusBadge
} from '../../components/ui/Primitives';

interface StaffDashboardData {
  metrics: {
    openTickets: number;
    inProgressTickets: number;
    escalatedTickets: number;
    urgentActiveTickets: number;
    pendingRefundReviews: number;
    pendingEscalations: number;
  };
  pendingEscalations: Escalation[];
  priorityQueue: Ticket[];
}

export function StaffDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['staff-dashboard'],
    queryFn: async () => (await apiRequest<StaffDashboardData>('/staff/dashboard')).data
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message={(error as Error)?.message ?? 'Unable to load staff overview'} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations Command"
        title="Staff Overview"
        description="Monitor high-priority customer tickets, review escalated refunds over ₹5,000, and manage active support queues."
        actions={
          <Link to="/staff/escalations">
            <Button variant="primary">
              <ShieldAlert className="h-4 w-4" />
              Review Escalations ({data.metrics.pendingEscalations})
            </Button>
          </Link>
        }
      />

      {/* Compact KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <span>Open Queue</span>
            <Inbox className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">{data.metrics.openTickets}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <span>Escalated Cases</span>
            <ShieldAlert className="h-4 w-4 text-crimson-ops" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-crimson-ops">
            {data.metrics.escalatedTickets}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <span>Urgent Active</span>
            <Flame className="h-4 w-4 text-ochre-ops" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">{data.metrics.urgentActiveTickets}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <span>Pending Refund Reviews</span>
            <RotateCcw className="h-4 w-4 text-emerald-ops" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">
            {data.metrics.pendingRefundReviews}
          </p>
        </Card>
      </div>

      {/* Pending Escalations & Priority Queue */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Pending Escalations</h2>
            <Link to="/staff/escalations" className="text-xs font-semibold text-accent hover:underline">
              Open workbench →
            </Link>
          </div>
          {data.pendingEscalations.length === 0 ? (
            <EmptyState
              title="All escalations cleared"
              description="There are currently no pending escalations awaiting human review."
            />
          ) : (
            <div className="space-y-3">
              {data.pendingEscalations.map((esc) => (
                <Card key={esc.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink">{esc.ticketNumber}</span>
                      <PriorityBadge priority={esc.priority} />
                    </div>
                    {esc.refund && (
                      <span className="font-mono text-sm font-bold tabular-nums text-crimson-ops">
                        {formatINR(esc.refund.amount)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-ink">{esc.summary}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                    <span>{esc.customer?.name}</span>
                    <Link
                      to={`/staff/tickets/${esc.ticketId}`}
                      className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                    >
                      Inspect & Decide <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Active Priority Queue</h2>
            <Link to="/staff/tickets" className="text-xs font-semibold text-accent hover:underline">
              Full queue →
            </Link>
          </div>
          <div className="space-y-2.5">
            {data.priorityQueue.map((ticket) => (
              <Link key={ticket.id} to={`/staff/tickets/${ticket.id}`} className="block">
                <Card className="p-4 hover:shadow-elevated">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink-muted">
                        {ticket.ticketNumber}
                      </span>
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                    </div>
                    <span className="text-xs text-ink-muted">{formatDateTime(ticket.updatedAt)}</span>
                  </div>
                  <p className="mt-2 font-semibold text-ink">{ticket.subject}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {ticket.customer?.name} · {ticket.assignedTo ? `Assigned to ${ticket.assignedTo.name}` : 'Unassigned'}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
